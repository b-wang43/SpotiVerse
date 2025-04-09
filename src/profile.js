import React from 'react';

// Receive profile and logout function as props
function ProfilePage({ profile, isLoading, logout }) {

    // Handle loading state if passed down specifically for profile
    // if (isLoading) {
    //     return <p>Loading Profile...</p>;
    // }

    // Profile object should exist if this component is rendered based on App.js logic
    if (!profile) {
        return <p>Could not load profile data.</p>; // Fallback
    }

    return (
        // Add fade-in logic here if desired (e.g., className="fade-in-section")
        // Note: The page-level fade is handled by motion.div in App.js
        <div className="user-profile"> {/* Reuse existing profile styles */}
            <h2>Welcome, {profile.display_name}!</h2>
            {profile.images?.[0]?.url && (
            <img src={profile.images[0].url} alt="Profile" width={100} style={{ borderRadius: '50%' }} />
            )}
            <p><a href={profile.external_urls.spotify} target="_blank" rel="noopener noreferrer">View Profile on Spotify</a></p>

            {/* Add Logout Button Here */}
            {/* You might want to reuse the button styling from App.css */}
            <button onClick={logout} style={{ marginTop: '25px' }}>Logout</button>
        </div>
    );
}

export default ProfilePage;
