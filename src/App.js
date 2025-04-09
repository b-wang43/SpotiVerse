// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { initScrollObserver } from './utils/scrollObserver';

// Import Components and Styles
import './App.css';
import Navbar from './navbar';
import ProfilePage from './profile';
import TopArtistsPage from './artistPage';
import TopTracksPage from './trackPage';
import RecommendationsPage from './recommendations';

// --- Constants ---
const CLIENT_ID = 'bbc74db9fb9243f595ad6eb98f082b79';
const REDIRECT_URI = 'http://localhost:5000';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'user-read-playback-position',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-private'
];
const SCOPES_URL_PARAM = SCOPES.join('%20');

// --- API Helper ---
async function fetchWebApi(endpoint, method, token, body = null) {
    const BASE_URL = 'https://api.spotify.com/v1';
    const apiUrl = `${BASE_URL}${endpoint}`;
    
    console.log("API Request URL:", apiUrl);
    console.log("Token being sent:", token);

    try {
        const res = await fetch(apiUrl, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            const errorData = await res.json();
            const errorMsg = errorData?.error?.message || res.statusText;
            console.error(`API Error (${res.status}): ${errorMsg}`);
            throw new Error(`Spotify API request failed: ${errorMsg}`);
        }

        return await res.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}
// --- Duration Formatter ---
function formatDuration(ms) {
    if (typeof ms !== 'number' || ms < 0) return 'N/A';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// --- Main App Component ---
function App() {
    // --- State ---
    const [token, setToken] = useState(window.localStorage.getItem('spotify_token')); // Initialize from localStorage
    const [profile, setProfile] = useState(null);
    const [topArtists, setTopArtists] = useState(null);
    const [topTracks, setTopTracks] = useState(null);
    const [recommendations, setRecommendations] = useState(null);
    const [topTracksAudioFeatures, setTopTracksAudioFeatures] = useState({});
    const [recommendationsAudioFeatures, setRecommendationsAudioFeatures] = useState({});
    const [loading, setLoading] = useState(false); // Tracks if *any* loading is happening
    const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Tracks if initial data load succeeded
    const [error, setError] = useState(null);

    // --- React Router Hooks ---
    const navigate = useNavigate();
    const location = useLocation();

    // --- Authentication Handling (Check on load, handle hash) ---
    useEffect(() => {
        console.log("App mount: Checking token status...");
        const hash = window.location.hash;
        const localToken = window.localStorage.getItem('spotify_token');
        const tokenExpiry = window.localStorage.getItem('spotify_token_expiry');
        let validTokenFound = false;
        // 1. Check hash for new token
        if (hash) {
            console.log("URL hash detected.");
            //window.history.pushState("", document.title, window.location.pathname + window.location.search); // Use pushState
        }
        // Check URL Hash for new token (after redirect)
        if (!localToken && hash) { // Add !localToken check
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const expiresIn = params.get('expires_in');
            if (accessToken && expiresIn) {
                const expiryTime = new Date().getTime() + parseInt(expiresIn) * 1000;
                // Quick check if expiry is valid
                if (expiryTime > new Date().getTime()) {
                    console.log("New token parsed from hash.");
                    window.localStorage.setItem('spotify_token', accessToken);
                    window.localStorage.setItem('spotify_token_expiry', expiryTime.toString());
                    setToken(accessToken); // Set token state
                    validTokenFound = true;
                    //navigate('/'); // <--- ADD THIS LINE: Navigate to home page
                } else {
                    console.log("Token from hash is already expired.");
                    window.localStorage.removeItem('spotify_token');
                    window.localStorage.removeItem('spotify_token_expiry');
                }
            } else {
                console.log("Hash did not contain valid token parameters.");
            }
        }
        // 2. Check localStorage if no valid token from hash
        if (!validTokenFound && localToken && tokenExpiry) {
            if (new Date().getTime() < parseInt(tokenExpiry)) {
                console.log("Valid token found in localStorage.");
                setToken(localToken); // Set token state
                validTokenFound = true;
            } else {
                console.log("Token in localStorage has expired.");
                window.localStorage.removeItem('spotify_token');
                window.localStorage.removeItem('spotify_token_expiry');
                setToken(null); // Ensure token state is null if expired
            }
        }
        if (!validTokenFound && token) {
            // If component had a token state but validation failed, clear it
            console.log("Clearing invalid token state.");
            setToken(null);
        }
    }, []);
    // --- Data Fetching ---
    useEffect(() => {
        // Only fetch if token exists AND initial load hasn't completed
        if (token && !initialLoadComplete) {
            console.log("Starting initial data fetch...");
            setLoading(true);
            setError(null);
            // Clear previous data to avoid showing stale data briefly
            setProfile(null); setTopArtists(null); setTopTracks(null); setRecommendations(null);
            setTopTracksAudioFeatures({}); setRecommendationsAudioFeatures({});

            const fetchAllData = async () => {
                try {
                    // Define chunk size for audio features requests
                    const chunkSize = 50;

                    // Fetch profile, artists, tracks in parallel
                    const [profile, topArtists, topTracks] = await Promise.all([
                        fetchWebApi('/me', 'GET', token),
                        fetchWebApi('/me/top/artists?time_range=medium_term&limit=50', 'GET', token),
                        fetchWebApi('/me/top/tracks?time_range=medium_term&limit=50', 'GET', token)
                    ]);

                    console.log('Profile data:', profile);
                    console.log('Artists data:', topArtists);
                    console.log('Tracks data:', topTracks);

                    setProfile(profile);
                    console.log("Profile fetched:", profile);

                    const topArtistItems = topArtists?.items || [];
                    setTopArtists(topArtistItems);
                    console.log("Top artists fetched:", topArtistItems.length, "artists");

                    const topTrackItems = topTracks?.items || [];
                    setTopTracks(topTrackItems);
                    console.log("Top tracks fetched:", topTrackItems.length, "tracks");

                    // Commenting out audio features fetching for now
                    /*
                    // Fetch audio features sequentially after getting IDs
                    let topTrackFeaturesMap = {};
                    if (topTrackItems.length > 0) {
                        // Split track IDs into chunks of 50 (Spotify's limit)
                        const trackIds = topTrackItems.map(t => t.id);
                        for (let i = 0; i < trackIds.length; i += chunkSize) {
                            const chunk = trackIds.slice(i, i + chunkSize);
                            const featuresData = await fetchWebApi(`/audio-features?ids=${chunk.join(',')}`, 'GET', token);
                            if (featuresData?.audio_features) {
                                featuresData.audio_features.forEach(f => { 
                                    if (f) topTrackFeaturesMap[f.id] = f;
                                });
                            }
                            // Add a small delay between requests to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        setTopTracksAudioFeatures(topTrackFeaturesMap);
                        console.log("Top tracks features fetched.");
                    }
                    */

                    // Fetch recommendations
                    const seed_artists = topArtistItems.slice(0, 2).map(a => a.id).join(',');
                    const trackSeedCount = Math.min(topTrackItems.length, 5 - (seed_artists ? seed_artists.split(',').length : 0));
                    const seed_tracks = trackSeedCount > 0 ? topTrackItems.slice(0, trackSeedCount).map(t => t.id).join(',') : '';

                    let recommendationItems = [];
                    if (seed_artists || seed_tracks) {
                        try {
                            const recParams = new URLSearchParams();
                            recParams.append('limit', '20');
                            
                            // Only add seed parameters if they exist
                            if (seed_artists) {
                                recParams.append('seed_artists', seed_artists);
                            }
                            if (seed_tracks) {
                                recParams.append('seed_tracks', seed_tracks);
                            }

                            console.log("Fetching recommendations with params:", recParams.toString());
                            const recsData = await fetchWebApi(`/recommendations?${recParams.toString()}`, 'GET', token);
                            
                            if (recsData?.tracks) {
                                recommendationItems = recsData.tracks;
                                setRecommendations(recommendationItems);
                                console.log("Recommendations fetched successfully:", recommendationItems.length, "tracks");
                            } else {
                                console.log("No recommendations data received");
                                setRecommendations([]);
                            }
                        } catch (error) {
                            console.error("Error fetching recommendations:", error);
                            setRecommendations([]);
                        }
                    } else {
                        console.log("Not enough seed data for recommendations.");
                        setRecommendations([]);
                    }

                    console.log("Initial data fetch successful.");
                    setInitialLoadComplete(true); // Mark initial load as done

                } catch (err) {
                     console.error("Error during initial data fetch:", err);
                     if (err.message.includes('401') || err.message.includes('403') || err.message.includes('token')) {
                          console.log("Authentication error detected, logging out.");
                          logout();
                     } else {
                          setError(err.message || 'An error occurred while fetching data.');
                     }
                } finally {
                    setLoading(false); // Stop loading indicator regardless of success/failure
                }
            };

            fetchAllData();
        }
    }, [token, initialLoadComplete]); // Effect dependencies

    useEffect(() => {
        const observer = initScrollObserver();
        return () => {
            observer.disconnect();
        };
    }, []);

    // Add scroll to top effect when route changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    // --- Login/Logout Handlers ---
    const handleLogin = () => {
        if (!CLIENT_ID) {
            alert('Error: Spotify Client ID is not configured in App.js');
            return;
        }
        console.log("Redirect URI:", REDIRECT_URI);
        // Corrected authUrl construction
        const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES_URL_PARAM}&response_type=token&show_dialog=true`;
        window.location.href = authUrl;
    };

    const logout = () => {
        console.log("Logging out...");
        setToken(null);
        setProfile(null); setTopArtists(null); setTopTracks(null); setRecommendations(null);
        setTopTracksAudioFeatures({}); setRecommendationsAudioFeatures({});
        setError(null); setLoading(false); setInitialLoadComplete(false); // Reset state fully
        window.localStorage.removeItem('spotify_token');
        window.localStorage.removeItem('spotify_token_expiry');
        navigate('/');
    };

    // --- Animation Variants for Pages ---
    const pageVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.4, ease: "easeInOut" } },
        exit: { opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } }
    };

    // --- Render Logic ---
    return (
        <div className="App">
            {!token ? (
                <div className="login-container">
                    <h1>Spotify Stats</h1>
                    <p>Connect your Spotify account to see your stats.</p>
                    <button onClick={handleLogin}>Connect Spotify</button>
                </div>
            ) : (
                <>
                    <Navbar />
                    <main className="content-area">
                        {loading && !initialLoadComplete && <p className="loading-text">Loading Spotify data...</p>}
                        {error && <p className="error">Error: {error}</p>}

                        <AnimatePresence mode="wait">
                            {initialLoadComplete && profile && (
                                <Routes location={location} key={location.pathname}>
                                    <Route path="/" element={
                                        <motion.div key="profile" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                            <ProfilePage profile={profile} logout={logout} />
                                        </motion.div>
                                    }/>
                                    <Route path="/profile" element={
                                        <motion.div key="profile" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                            <ProfilePage profile={profile} logout={logout} />
                                        </motion.div>
                                    }/>
                                    <Route path="/top-artists" element={
                                        <motion.div key="top-artists" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                            <TopArtistsPage artists={topArtists} />
                                        </motion.div>
                                    }/>
                                    <Route path="/top-tracks" element={
                                        <motion.div key="top-tracks" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                            <TopTracksPage 
                                                tracks={topTracks} 
                                                features={topTracksAudioFeatures} 
                                                formatDuration={formatDuration} 
                                            />
                                        </motion.div>
                                    }/>
                                    <Route path="/recommendations" element={
                                        <motion.div key="recommendations" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                            <RecommendationsPage recommendations={recommendations} features={recommendationsAudioFeatures} formatDuration={formatDuration} />
                                        </motion.div>
                                    }/>
                                    <Route path="*" element={
                                        <motion.div key="notfound" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                                                <h2>404: Page Not Found</h2>
                                                <p>The page you requested does not exist.</p>
                                                <button onClick={() => navigate('/')}>Go to Home</button>
                                            </div>
                                        </motion.div>
                                    }/>
                                </Routes>
                            )}
                            {!loading && initialLoadComplete && !profile && <p className="error">Failed to load profile data.</p>}
                        </AnimatePresence>
                    </main>
                </>
            )}
        </div>
    );
}

export default App;
