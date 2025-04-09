// src/TopTracksPage.js
import React from 'react';
import { motion } from 'framer-motion';
import './trackPage.css';

// Receive tracks, audio features map, and formatter function as props
function TopTracksPage({ tracks, features, formatDuration }) {
    if (!tracks || tracks.length === 0) {
        return (
            <div className="page-container">
                <h2>Top Tracks</h2>
                <p>No tracks data available.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h2>Your Top Tracks</h2>
            <ul className="track-list">
                {tracks.map((track, index) => (
                    <motion.li
                        key={track.id}
                        className="track-item"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="track-number">{index + 1}</div>
                        <div className="track-image-container">
                            <img 
                                src={track.album.images[0]?.url || 'https://via.placeholder.com/150'} 
                                alt={track.name}
                                className="track-image"
                            />
                        </div>
                        <div className="track-details">
                            <div className="track-header">
                                <a 
                                    href={track.external_urls?.spotify} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="track-name"
                                >
                                    {track.name}
                                </a>
                                <div className="track-artists">
                                    {track.artists.map(artist => artist.name).join(', ')}
                                </div>
                            </div>
                            <div className="track-metrics">
                                <span>Duration: {formatDuration(track.duration_ms)}</span>
                                {track.popularity != null && <span>Popularity: {track.popularity}</span>}
                                {features[track.id]?.danceability != null && (
                                    <span>Danceability: {features[track.id].danceability.toFixed(2)}</span>
                                )}
                                {features[track.id]?.energy != null && (
                                    <span>Energy: {features[track.id].energy.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    </motion.li>
                ))}
            </ul>
        </div>
    );
}

export default TopTracksPage;
