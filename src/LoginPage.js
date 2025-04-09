import React from 'react';
import './App.css';

function LoginPage({ onLogin }) {
    return (
        <div className="login-container">
            <h1>Spotify Stats</h1>
            <p>Connect your Spotify account to see your stats.</p>
            <button onClick={onLogin}>Connect</button>
        </div>
    );
}

export default LoginPage; 