import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Uncaught error in component tree:', error, info);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <main className="app-error-boundary" role="alert">
                    <section className="app-error-boundary__panel">
                        <p className="app-error-boundary__eyebrow">Ubakala Unity Cup</p>
                        <h1>We couldn't display this page</h1>
                        <p className="app-error-boundary__message">
                            An unexpected issue prevented this page from displaying. Please try again or return to the homepage.
                        </p>
                        <div className="app-error-boundary__actions">
                            <button type="button" onClick={this.handleRetry}>
                                Try again
                            </button>
                            <a href="/">Return to homepage</a>
                        </div>
                    </section>
                </main>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
