from django.contrib import admin
from django.forms.models import BaseInlineFormSet
from .models import Team, Season, Match, News, Group, TeamGroup
from .models_rbac import UserRole, Permission
from django.urls import path
from django.shortcuts import render, redirect
from django import forms
from django.contrib import messages
import difflib
import openpyxl
from datetime import datetime
from django.template.response import TemplateResponse
from django.core.management import call_command
from django.utils import timezone


class TeamGroupInlineFormset(BaseInlineFormSet):
	"""Ensure TeamGroup.season is set from the parent Group when saving from admin inline."""
	def save_new(self, form, commit=True):
		obj = super().save_new(form, commit=False)
		# self.instance is the parent Group
		parent = getattr(self, 'instance', None)
		if parent is not None and hasattr(parent, 'season'):
			obj.season = parent.season
		if commit:
			obj.save()
			form.save_m2m()
		return obj

	def save_existing(self, form, instance, commit=True):
		obj = super().save_existing(form, instance, commit=False)
		parent = getattr(self, 'instance', None)
		if parent is not None and hasattr(parent, 'season'):
			obj.season = parent.season
		if commit:
			obj.save()
			form.save_m2m()
		return obj


class TeamGroupInline(admin.TabularInline):
	model = TeamGroup
	formset = TeamGroupInlineFormset
	extra = 1
	# Make 'team' editable so you can select a team to add
	fields = ('team',)
	ordering = ('team__name',)


class SeasonCategoryFilter(admin.SimpleListFilter):
	"""Filter matches by their season category (senior_boys, girls, junior_boys)."""
	title = 'Season Category'
	parameter_name = 'season_category'

	def lookups(self, request, model_admin):
		return Season.CATEGORY_CHOICES

	def queryset(self, request, queryset):
		if self.value():
			return queryset.filter(season__category=self.value())
		return queryset


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
	list_display = ('name', 'season', 'team_count')
	list_filter = ('season',)
	inlines = [TeamGroupInline]

	def team_count(self, obj):
		return obj.teamgroup_set.count()
	team_count.short_description = 'Teams'


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
	list_display = ('name', 'short_name')
	search_fields = ('name',)


admin.site.register(Season)
@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
	list_display = ('season', 'home_team', 'away_team', 'match_date', 'venue', 'is_played', 'void')
	ordering = ('match_date',)
	# Restore sidebar filters (SeasonCategoryFilter + season)
	list_filter = (SeasonCategoryFilter, 'season')
	actions = ['mark_awarded_action']

	# (no custom change_list_template)

	def get_urls(self):
		urls = super().get_urls()
		custom = [
			path('import-matches/', self.admin_site.admin_view(self.import_matches), name='league_match_import'),
			path('bracket/', self.admin_site.admin_view(self.bracket_view), name='league_bracket'),
			path('bracket/resolve/<int:match_id>/', self.admin_site.admin_view(self.resolve_placeholder), name='league_bracket_resolve'),
		]
		return custom + urls

	def import_matches(self, request):
		if request.method == 'POST':
			f = request.FILES.get('match_file')
			if not f:
				messages.error(request, 'No file uploaded')
				return redirect('..')
			try:
				wb = openpyxl.load_workbook(f)
				sheet = wb.active
			except Exception as e:
				messages.error(request, f'Invalid Excel file: {e}')
				return redirect('..')

			# Expect header row: Season, Home Team, Away Team, Match Date, Venue
			rows = list(sheet.iter_rows(min_row=1, values_only=True))
			if not rows:
				messages.error(request, 'Excel file is empty')
				return redirect('..')
			header = [str(h).strip() if h is not None else '' for h in rows[0]]
			required = ['Season', 'Home Team', 'Away Team', 'Match Date']
			# 'Match Time' column is optional. We expect a single 'Match Date' column which may include time (e.g. '2025-02-12 16:00') or be an Excel datetime.
			has_time_col = any(h.lower() == 'match time' for h in header)
			has_matchday_col = any(h.lower() == 'matchday' for h in header)
			if not all(any(r.lower() == h.lower() for h in header) for r in required):
				messages.error(request, f'Header must include: {required}. Found: {header}')
				return redirect('..')

			created = 0
			errors = []
			error_rows = []
			for i, row in enumerate(rows[1:], start=2):
				data = dict(zip(header, row))
				# Initialize matchday and venue early so error handling can reference them
				matchday_val = data.get('Matchday') if has_matchday_col else None
				venue = data.get('Venue') or ''
				season_val = data.get('Season')
				home_name = data.get('Home Team')
				away_name = data.get('Away Team')
				date_val = data.get('Match Date')
				time_val = data.get('Match Time') if has_time_col else None
				# Require Match Date (single column). Time is optional if included in Match Date or as a separate Match Time column.
				if not date_val or str(date_val).strip() == '':
					errors.append(f'Row {i}: Match Date is required and must not be blank.')
					error_rows.append({
						'row': i,
						'season': season_val,
						'home': home_name,
						'away': away_name,
						'match_date': date_val,
						'match_time': time_val if time_val is not None else '',
						'matchday': matchday_val,
						'venue': venue,
						'error': 'Match Date is required and must not be blank.'
					})
					continue


				# Only accept 'd/m/Y h:mm:ss AM/PM' format (e.g. '6/12/2025 4:00:00 PM')
				match_dt = None
				s_date = str(date_val).strip()
				try:
					match_dt = datetime.strptime(s_date, '%d/%m/%Y %I:%M:%S %p')
				except Exception:
					errors.append(f"Row {i}: invalid date/time format (must be 'd/m/Y h:mm:ss AM/PM', got '{s_date}')")
					error_rows.append({
						'row': i,
						'season': season_val,
						'home': home_name,
						'away': away_name,
						'match_date': date_val,
						'match_time': time_val if time_val is not None else '',
						'matchday': matchday_val,
						'venue': venue,
						'error': f"invalid date/time format (must be 'd/m/Y h:mm:ss AM/PM', got '{s_date}')"
					})
					continue

				# ensure matchday and venue values
				matchday_val = data.get('Matchday') if has_matchday_col else None
				venue = data.get('Venue') or ''

				# resolve season
				season = None
				if season_val is None:
					errors.append(f'Row {i}: missing Season')
					continue
				try:
					sid = int(season_val)
					season = Season.objects.filter(id=sid).first()
				except Exception:
					season = Season.objects.filter(name__iexact=str(season_val)).first()
				if not season:
					errors.append(f'Row {i}: season not found ({season_val})')
					continue

				# resolve teams
				home = Team.objects.filter(name__iexact=str(home_name).strip()).first()
				away = Team.objects.filter(name__iexact=str(away_name).strip()).first()
				# If exact match not found, try fuzzy suggestions to help admin fix import
				if not home:
					existing = list(Team.objects.values_list('name', flat=True))
					close_home = difflib.get_close_matches(str(home_name).strip(), existing, n=3, cutoff=0.82)
					errors.append(f'Row {i}: home team not found (home={home_name})')
					error_rows.append({
						'row': i,
						'season': season_val,
						'home': home_name,
						'away': away_name,
						'match_date': date_val,
						'match_time': time_val,
						'matchday': matchday_val,
						'venue': venue,
						'error': f'Home team not found. Suggestions: {close_home}'
					})
					continue
				if not away:
					existing = list(Team.objects.values_list('name', flat=True))
					close_away = difflib.get_close_matches(str(away_name).strip(), existing, n=3, cutoff=0.82)
					errors.append(f'Row {i}: away team not found (away={away_name})')
					error_rows.append({
						'row': i,
						'season': season_val,
						'home': home_name,
						'away': away_name,
						'match_date': date_val,
						'match_time': time_val,
						'matchday': matchday_val,
						'venue': venue,
						'error': f'Away team not found. Suggestions: {close_away}'
					})
					continue



				# create match
				try:
					match_kwargs = dict(
						season=season,
						home_team=home,
						away_team=away,
						match_date=match_dt,
						venue=venue,
					)
					if matchday_val is not None and str(matchday_val).strip() != '':
						try:
							match_kwargs['matchday'] = int(matchday_val)
						except Exception:
							match_kwargs['matchday'] = None
					Match.objects.create(**match_kwargs)
					created += 1
				except Exception as e:
					err = f'Row {i}: failed to create match: {e}'
					errors.append(err)
					error_rows.append({
						'row': i,
						'season': season_val,
						'home': home_name,
						'away': away_name,
						'match_date': date_val,
						'match_time': time_val,
						'matchday': matchday_val,
						'venue': venue,
						'error': str(e),
					})

			msg = f'Imported {created} matches.'
			if errors:
				# Build CSV of errors and return as attachment so admin can download
				import csv
				import io

				output = io.StringIO()
				writer = csv.DictWriter(output, fieldnames=['row', 'season', 'home', 'away', 'match_date', 'match_time', 'matchday', 'venue', 'error'])
				writer.writeheader()
				for er in error_rows:
					writer.writerow(er)
				csv_data = output.getvalue()
				output.close()

				response = render(request, 'admin/message.html', {'message': msg + ' Some rows had errors. Download will start.'})
				# Return CSV as attachment
				from django.http import HttpResponse
				resp = HttpResponse(csv_data, content_type='text/csv')
				resp['Content-Disposition'] = 'attachment; filename="match_import_errors.csv"'
				return resp
			else:
				messages.success(request, msg)
				return redirect('..')

		# GET -> redirect to changelist
		return redirect('..')

	def bracket_view(self, request):
		"""Simple admin view to display bracket matches for a season and allow resolving placeholders."""
		from .models import Season, Match

		season_key = request.GET.get('season', None) or '2025 JUNIOR BOYS CUP'
		season = Season.objects.filter(name__iexact=season_key).first()
		if not season:
			self.message_user(request, f"Season not found: {season_key}", level=messages.ERROR)
			return redirect('..')

		matches = Match.objects.filter(season=season).order_by('matchday', 'match_date')
		# group by matchday
		from collections import defaultdict
		groups = defaultdict(list)
		for m in matches:
			groups[m.matchday].append(m)

		context = {
			'title': f'Bracket for {season.name}',
			'season': season,
			'groups': sorted(groups.items(), key=lambda x: (x[0] if x[0] is not None else 9999)),
			'opts': self.model._meta,
		}
		return TemplateResponse(request, 'admin/league/bracket.html', context)

	def resolve_placeholder(self, request, match_id):
		"""Resolve placeholders for a single source match (by pk)."""
		from . import signals
		from .models import Match
		try:
			m = Match.objects.get(pk=match_id)
		except Match.DoesNotExist:
			self.message_user(request, f"Match {match_id} not found.", level=messages.ERROR)
			return redirect('..')

		# If a forced winner was provided in query string, apply it
		force = request.GET.get('force')
		if force in ('home', 'away'):
			# determine winner and loser
			winner = m.home_team if force == 'home' else m.away_team
			loser = m.away_team if force == 'home' else m.home_team
			try:
				# perform replacement directly
				from .models import Team, Match
				matchnum = getattr(m, 'matchday', None)
				if matchnum:
					wp = Team.objects.filter(name=f"WINNER {matchnum} (placeholder)").first()
					if wp:
						Match.objects.filter(season=m.season, home_team=wp).update(home_team=winner)
						Match.objects.filter(season=m.season, away_team=wp).update(away_team=winner)
					lp = Team.objects.filter(name=f"LOSER {matchnum} (placeholder)").first()
					if lp:
						Match.objects.filter(season=m.season, home_team=lp).update(home_team=loser)
						Match.objects.filter(season=m.season, away_team=lp).update(away_team=loser)
					# delete placeholders
					Team.objects.filter(name__icontains=f"WINNER {matchnum} (placeholder)").delete()
					Team.objects.filter(name__icontains=f"LOSER {matchnum} (placeholder)").delete()
				call_command('recompute_standings')
				self.message_user(request, f"Forced winner applied for match {m.id}.", level=messages.SUCCESS)
			except Exception as e:
				self.message_user(request, f"Failed to force winner: {e}", level=messages.ERROR)
			return redirect('..')
		else:
			try:
				signals._replace_placeholders_for_match(m)
				call_command('recompute_standings')
				self.message_user(request, f"Resolved placeholders for match {m.id}.", level=messages.SUCCESS)
			except Exception as e:
				self.message_user(request, f"Failed to resolve placeholders: {e}", level=messages.ERROR)

		# redirect back to bracket for the same season
		return redirect('..')


	def mark_awarded_action(self, request, queryset):
		"""Admin action: show a form to choose `awarded_to` and `reason`, then apply award to selected matches."""
		if 'apply' in request.POST:
			# process submission
			form = forms.Form(request.POST)
			form.fields['awarded_to'] = forms.ModelChoiceField(queryset=Team.objects.all())
			form.fields['reason'] = forms.CharField(required=False)
			if form.is_valid():
				awarded_team = form.cleaned_data['awarded_to']
				reason = form.cleaned_data['reason']
				updated = 0
				for match in queryset:
					# backup original scores if fields exist
					orig_home = getattr(match, 'home_score', None)
					orig_away = getattr(match, 'away_score', None)
					for field_name in ('original_home_score', 'orig_home_score', 'backup_home_score'):
						if hasattr(match, field_name):
							setattr(match, field_name, orig_home)
					for field_name in ('original_away_score', 'orig_away_score', 'backup_away_score'):
						if hasattr(match, field_name):
							setattr(match, field_name, orig_away)

					# set awarded scores
					if awarded_team.pk == match.home_team_id:
						match.home_score = 3
						match.away_score = 0
					elif awarded_team.pk == match.away_team_id:
						match.home_score = 0
						match.away_score = 3

					# mark awarded flags and metadata
					if hasattr(match, 'awarded'):
						match.awarded = True
					elif hasattr(match, 'is_awarded'):
						match.is_awarded = True

					if hasattr(match, 'awarded_to'):
						match.awarded_to = awarded_team
					elif hasattr(match, 'awarded_team'):
						match.awarded_team = awarded_team

					if hasattr(match, 'award_reason'):
						match.award_reason = reason
					elif hasattr(match, 'awarded_reason'):
						match.awarded_reason = reason

					if hasattr(match, 'awarded_at'):
						match.awarded_at = timezone.now()

					# If reason is a walkover, mark match as played
					if reason and isinstance(reason, str) and reason.strip().lower() == 'walkover':
						if hasattr(match, 'is_played'):
							match.is_played = True
						elif hasattr(match, 'played'):
							match.played = True

					match.save()
					updated += 1

				# recompute standings
				try:
					call_command('recompute_standings')
				except Exception:
					pass

				self.message_user(request, f"Updated {updated} matches and recomputed standings.", level=messages.SUCCESS)
				return None
		else:
			# initial display: build a simple form
			form = forms.Form()
			form.fields['awarded_to'] = forms.ModelChoiceField(queryset=Team.objects.all())
			form.fields['reason'] = forms.CharField(required=False)

		opts = self.model._meta
		context = {
			'title': 'Mark selected matches as awarded',
			'queryset': queryset,
			'form': form,
			'opts': opts,
			'action_checkbox_name': admin.ACTION_CHECKBOX_NAME,
		}
		return TemplateResponse(request, 'admin/league/mark_awarded.html', context)

    # NOTE: server-side top-bar filtering removed; sidebar filters are used instead.
@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
	list_display = ('title', 'subtitle', 'author', 'published_at')
	search_fields = ('title', 'subtitle', 'content', 'author')
	readonly_fields = ('published_at',)
	ordering = ('-published_at',)


# RBAC Admin Registration
class PermissionInline(admin.TabularInline):
	model = Permission
	extra = 0


class UserRoleAdmin(admin.ModelAdmin):
	list_display = ('user', 'role', 'permission_count')
	list_filter = ('role',)
	inlines = [PermissionInline]
	
	def permission_count(self, obj):
		return obj.permissions.count()
	permission_count.short_description = 'Permissions'


admin.site.register(UserRole, UserRoleAdmin)

