import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        this.setState({ error, info });
        // eslint-disable-next-line no-console
        console.error('Uncaught error in component tree:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, color: '#111', background: '#fff6f6', minHeight: '100vh' }}>
                    <h2 style={{ color: '#b91c1c' }}>Something went wrong</h2>
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
                        {this.state.error?.toString()}
                    </div>
                    {this.state.info && <details style={{ marginTop: 12 }}>{this.state.info.componentStack}</details>}
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
