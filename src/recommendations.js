// src/RecommendationsPage.js
import React from 'react';

// Receive recommendations, features map, and formatter function as props
function RecommendationsPage({ recommendations, features, formatDuration }) {

    // Handle loading or missing data state
    if (!recommendations) {
        return <p className="loading-text">Loading recommendations or none available...</p>;
    }

    return (
        <div className="page-container">
            <section className="stats-section">
                <h2>Recommended For You</h2>
                {recommendations.length > 0 ? (
                    <ul>
                        {recommendations.map((track) => {
                            // Safely get audio features
                            const trackFeatures = features ? features[track.id] : null;
                            return (
                                <li key={track.id}>
                                     {track.album?.images?.[2]?.url ?
                                        <img
                                            src={track.album.images[2].url}
                                            alt={track.album?.name || 'Album art'}
                                            width={60} height={60}
                                            loading="lazy"
                                        /> :
                                        <div className="placeholder-image track-placeholder" style={{width: '60px', height: '60px'}}></div>
                                     }
                                    <div className="item-details">
                                        {/* Track Title */}
                                        <a href={track.external_urls?.spotify} target="_blank" rel="noopener noreferrer">{track.name || 'Unknown Track'}</a>
                                        {/* Artist Names */}
                                        {track.artists && track.artists.length > 0 && (
                                            <span className="artist-names">
                                                by {track.artists.map(artist => artist.name).join(', ')}
                                            </span>
                                        )}
                                        {/* Track Metrics */}
                                        <div className="metrics">
                                             {track.popularity != null && <span>Pop: {track.popularity}</span>}
                                             {track.duration_ms != null && (
                                                <span>Dur: {formatDuration(track.duration_ms)}</span>
                                            )}
                                            {trackFeatures?.liveness != null && (
                                                <span>Live: {trackFeatures.liveness.toFixed(3)}</span>
                                            )}
                                            {trackFeatures?.danceability != null && (
                                                <span>Dance: {trackFeatures.danceability.toFixed(3)}</span>
                                            )}
                                             {trackFeatures?.energy != null && (
                                                <span>Energy: {trackFeatures.energy.toFixed(3)}</span>
                                            )}
                                            {/* Add more features as desired */}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    // Message if recommendations couldn't be generated
                    <p>Could not generate recommendations based on your current top items.</p>
                )}
            </section>
        </div>
    );
}

export default RecommendationsPage;
