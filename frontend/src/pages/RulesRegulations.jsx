import React from 'react';
import './RulesRegulations.css';

const regulationSections = [
  {
    heading: '1. MATCH FIXING AND MANIPULATION',
    paragraphs: [
      'Match fixing, deliberate manipulation of results or any arrangement intended to compromise the integrity of a match is strictly prohibited.',
      "Any team found guilty will face disqualification from that year's competition, a fine of ₦50,000 before readmission in a subsequent year, and the submission of an apology letter to Ubakala through the Sports Director."
    ]
  },
  {
    heading: '2. TEAM PARTICIPATION AND WITHDRAWAL',
    paragraphs: [
      "Communities intending not to participate in a particular year's competition must formally notify the committee in writing before the team-picking exercise.",
      'The same notification requirement applies where a community intends to withdraw any of its categories.',
      'Failure to provide the required notification attracts a ₦20,000 fine under the conditions stated in the addendum.'
    ]
  },
  {
    heading: '3. PROTESTS AND COMPLAINTS',
    paragraphs: [
      'A team that suspects a breach of competition rules must follow the official protest procedure.',
      'A protest must be registered before the commencement of the match with the appointed Match Commissioner. The protesting team must complete the protest complaint form and pay the stipulated ₦10,000 fee in full.',
      'The required photographic evidence must be obtained in accordance with the addendum and submitted to the committee secretary before 12 noon the following day.',
      'Teams are expected to cooperate with the protest process. Obstructing the photographing of a player against whom a protest has been made attracts the stipulated penalty.',
      'The Protest Committee is responsible for hearing and determining all properly registered protests within 48 hours after Match Day.',
      'A team dissatisfied with the decision may appeal first to the Sports Director and subsequently to the Union President General.'
    ]
  },
  {
    heading: '4. WALKOVER AND FAILURE TO HONOUR FIXTURES',
    paragraphs: [
      'Every team is expected to honour its scheduled fixtures.',
      'A team that fails to appear for its match, or fails to honour a fixture without duly informing the committee, will be subject to the walkover provisions and applicable ₦20,000 fine.',
      'Teams must arrive at the match venue at least one hour before kickoff.',
      'The addendum also provides that a team arriving 10 minutes after the scheduled kickoff time is liable to a walkover.'
    ]
  },
  {
    heading: '5. PLAYER ELIGIBILITY AND CATEGORY RESTRICTIONS',
    categories: [
      {
        heading: 'Junior Boys Category',
        paragraphs: ['The approved maximum weight is 50kg.']
      },
      {
        heading: 'Intermediate Category',
        paragraphs: [
          'The approved maximum weight is 65kg. In addition, a player must not have been Senior Boys Tested.',
          'The Intermediate category was initially considered for facial screening. However, following reactions and further deliberations, the resolution was revised to the 65kg weight requirement and the restriction against players who have undergone Senior Boys testing.'
        ]
      },
      {
        heading: 'Senior Boys Category',
        paragraphs: [
          'Players must comply with the applicable registration and eligibility requirements for the category.',
          'A player who participates in the Intermediate category must not be fielded in Senior Boys during the same year.'
        ]
      }
    ]
  },
  {
    heading: '6. DISCIPLINE, CAUTIONS AND SUSPENSIONS',
    paragraphs: [
      'Players are expected to maintain discipline and respect match officials, opponents, spectators and the competition authorities.'
    ],
    penalties: [
      ['Yellow Card:', ' A fine of ₦1,000.'],
      ['Two Yellow Cards in One Match:', ' This results in a red card, a ₦2,000 fine and a one-match suspension.'],
      ['Red Card:', ' The applicable offence attracts a ₦1,500 fine and a one-match suspension.'],
      ['Straight Red Card:', ' Attracts a ₦3,000 fine and a two-match suspension.']
    ],
    closing: [
      'Teams are responsible for ensuring that suspended players do not participate in matches during their suspension.'
    ]
  },
  {
    heading: '7. CONDUCT TOWARDS SPECTATORS AND MATCH OFFICIALS',
    paragraphs: [
      'Violence, intimidation and physical confrontation have no place in the competition.',
      'Any player who, out of annoyance, engages in a fight with a spectator faces a two-match ban and a ₦20,000 fine.',
      "Any player, fan or community found fighting referees or members of the Local Organizing Committee will attract a ₦300,000 fine, payable before the team's next match, together with an apology letter.",
      'All participants and supporters are expected to respect match officials and committee representatives at all times.'
    ]
  },
  {
    heading: '8. PRE-MATCH REQUIREMENTS AND TEAM PRESENTATION',
    paragraphs: [
      "Every participating team must comply with the competition's pre-match arrangements.",
      'The pre-match meeting is compulsory and is scheduled for 10:00am. Teams are required to present their jerseys as part of this exercise.',
      'Failure to comply attracts a ₦5,000 fine.',
      'All teams are also required to obtain and use the approved match passes.'
    ]
  },
  {
    heading: '9. REGISTRATION AND COMPULSORY PAYMENTS',
    paragraphs: ['The approved community registration and associated charges are:'],
    charges: [
      'Community registration: ₦30,000',
      'Labour: ₦5,000',
      'Compulsory flex: ₦6,000'
    ],
    total: 'Total: ₦41,000',
    closing: [
      'Participating communities are expected to fulfil these financial requirements as stipulated by the committee.'
    ]
  },
  {
    heading: '10. APPLICATION OF FOOTBALL PRINCIPLES',
    paragraphs: [
      "The competition recognises established football principles and practices, including relevant provisions of FIFA's Laws of the Game.",
      "Where a particular situation is not expressly addressed in the competition's written regulations, established football principles and the applicable decisions of the competition authorities may guide its administration.",
      'However, the specific rules and approved decisions of the Ubakala Football Competition remain binding on participating teams.'
    ]
  }
];

function RegulationSection({ section }) {
  return (
    <section className="rules-section">
      <h2 className="rules-section__title">{section.heading}</h2>
      {section.paragraphs?.map(paragraph => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.categories?.map(category => (
        <div className="rules-category" key={category.heading}>
          <h3>{category.heading}</h3>
          {category.paragraphs.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ))}
      {section.penalties && (
        <ul className="rules-list rules-list--penalties">
          {section.penalties.map(([label, details]) => (
            <li key={label}>
              <strong>{label}</strong>{details}
            </li>
          ))}
        </ul>
      )}
      {section.charges && (
        <ul className="rules-list">
          {section.charges.map(charge => <li key={charge}>{charge}</li>)}
        </ul>
      )}
      {section.total && <p className="rules-total"><strong>{section.total}</strong></p>}
      {section.closing?.map(paragraph => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

export default function RulesRegulations() {
  return (
    <div className="rules-page">
      <main className="rules-content">
        <header className="rules-header">
          <h1>UBAKALA FOOTBALL COMPETITION</h1>
          <p>RULES, REGULATIONS AND PARTICIPANT GUIDE</p>
        </header>

        <article className="rules-document">
          <section className="rules-section rules-introduction">
            <h2 className="rules-section__title">INTRODUCTION</h2>
            <p>
              The Ubakala Football Competition is governed by established rules and regulations designed to promote fairness, discipline, sportsmanship and orderly conduct throughout the competition.
            </p>
            <p>
              All participating communities, teams, players, coaches, team managers, supporters and match officials are expected to familiarise themselves with the competition regulations and comply with the directives of the Local Organizing Committee (LOC).
            </p>
            <p>Ignorance of the rules will not be accepted as an excuse for non-compliance.</p>
            <p>
              The official competition rules, including the published addendum, are binding on all participating teams and individuals.
            </p>
          </section>

          {regulationSections.map(section => (
            <RegulationSection key={section.heading} section={section} />
          ))}

          <section className="rules-section rules-notice">
            <h2 className="rules-section__title">IMPORTANT NOTICE</h2>
            <p>
              Every participating community, team official and player is responsible for understanding and complying with the competition regulations.
            </p>
            <p>
              The official addendum forms part of the competition&apos;s governing rules and must be read alongside this explanatory guide.
            </p>
            <p>
              Where this guide is intended to explain a provision, the official wording in the addendum remains authoritative.
            </p>
            <p>
              The Local Organizing Committee reserves the responsibility to administer the competition in accordance with its approved rules, regulations and decisions.
            </p>
          </section>
        </article>

        <section className="rules-download" aria-labelledby="rules-download-title">
          <div className="rules-download__copy">
            <h2 id="rules-download-title">OFFICIAL RULES AND REGULATIONS ADDENDUM</h2>
            <p>
              For the complete official provisions, penalties and regulations approved for the Ubakala Football Competition, participants are encouraged to download and read the original addendum.
            </p>
          </div>
          <a
            className="rules-download__button"
            href="/New%20Rules%20and%20regulation%20for%20ubakala%20sports.pdf"
            download="New Rules and regulation for ubakala sports.pdf"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 2.75h8l4.25 4.3v14.2H6z" />
              <path d="M14 2.75v4.5h4.25M8.5 13h7M8.5 16h7" />
              <text x="7.5" y="11" aria-hidden="true">PDF</text>
            </svg>
            <span>DOWNLOAD OFFICIAL RULES &amp; REGULATIONS ADDENDUM (PDF)</span>
          </a>
        </section>
      </main>
    </div>
  );
}
