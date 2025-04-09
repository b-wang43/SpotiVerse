// src/TopArtistsPage.js
import React from 'react';
import { motion } from 'framer-motion';
import './artistPage.css';

// Receive artists array as props
function TopArtistsPage({ artists }) {
    if (!artists || artists.length === 0) {
        return (
            <div className="page-container">
                <h2>Top Artists</h2>
                <p>No artists data available.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <ul className="artist-list">
                {artists.map((artist, index) => (
                    <motion.li
                        key={artist.id}
                        className="artist-item"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="artist-number">{index + 1}</div>
                        <div className="artist-image-container">
                            <img 
                                src={artist.images[0]?.url || 'https://via.placeholder.com/150'} 
                                alt={artist.name}
                                className="artist-image"
                            />
                        </div>
                        <div className="artist-details">
                            <div className="artist-header">
                                <a 
                                    href={artist.external_urls?.spotify} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="artist-name"
                                >
                                    {artist.name}
                                </a>
                                <div className="artist-genres">
                                    {artist.genres && artist.genres.length > 0 ? artist.genres.join(', ') : ''}
                                </div>
                            </div>
                            <div className="artist-metrics">
                                {artist.popularity != null && <span>Popularity: {artist.popularity}</span>}
                                {artist.followers?.total != null && (
                                    <span>Followers: {artist.followers.total.toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                    </motion.li>
                ))}
            </ul>
        </div>
    );
}

export default TopArtistsPage;
