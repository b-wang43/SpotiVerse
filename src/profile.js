import React from 'react';

// Receive profile and logout function as props
function ProfilePage({ profile, topArtists, topTracks }) {
    // Check if profile data is available
    if (!profile) {
        return <div className="loading-text">Loading profile data...</div>;
    }

    // Calculate favorite genres
    const genreCounts = {};
    topArtists?.forEach(artist => {
        artist.genres?.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
    });
    const topGenres = Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([genre]) => genre);

    // Calculate average artist popularity
    const avgPopularity = topArtists?.length 
        ? Math.round(topArtists.reduce((sum, artist) => sum + artist.popularity, 0) / topArtists.length)
        : 0;

    // Calculate average track duration
    const avgDuration = topTracks?.length
        ? Math.round(topTracks.reduce((sum, track) => sum + track.duration_ms, 0) / topTracks.length / 1000)
        : 0;

    return (
        <div className="user-profile">
            <h2>Welcome, {profile.display_name}!</h2>
            {profile.images?.[0]?.url && (
                <img 
                    src={profile.images[0].url} 
                    alt="Profile" 
                    width={100} 
                    style={{ borderRadius: '50%' }} 
                />
            )}
            <p>
                <a 
                    href={profile.external_urls?.spotify} 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    View Profile on Spotify
                </a>
            </p>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Followers</h3>
                    <div className="large-number">{profile.followers?.total || 0}</div>
                </div>

                <div className="stat-card">
                    <h3>Favorite Genres</h3>
                    <ul className="genres-list">
                        {topGenres.length > 0 ? (
                            topGenres.map((genre, index) => (
                                <li key={index}>{genre}</li>
                            ))
                        ) : (
                            <li>No genre data available</li>
                        )}
                    </ul>
                </div>

                <div className="stat-card">
                    <h3>Average Artist Popularity</h3>
                    <div className="large-fraction">{avgPopularity}/100</div>
                </div>

                <div className="stat-card">
                    <h3>Average Track Duration</h3>
                    <div className="large-duration">{Math.floor(avgDuration / 60)}:{String(avgDuration % 60).padStart(2, '0')}</div>
                </div>

                <div className="stat-card">
                    <h3>Top Tracks</h3>
                    {topTracks?.slice(0, 5).map((track, index) => (
                        <p key={index}>{index + 1}. {track.name}</p>
                    ))}
                </div>

                <div className="stat-card">
                    <h3>Top Artists</h3>
                    {topArtists?.slice(0, 5).map((artist, index) => (
                        <p key={index}>{index + 1}. {artist.name}</p>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
