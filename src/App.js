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
import LoginPage from './LoginPage';
import TimeRangeSelector from './components/TimeRangeSelector';

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

// --- Main App Component ---
function App() {
    // --- State ---
    const [token, setToken] = useState(window.localStorage.getItem('spotify_token')); // Initialize from localStorage
    const [profile, setProfile] = useState(null);
    const [topArtists, setTopArtists] = useState([]);
    const [topTracks, setTopTracks] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [topTracksAudioFeatures, setTopTracksAudioFeatures] = useState({});
    const [recommendationsAudioFeatures, setRecommendationsAudioFeatures] = useState({});
    const [loading, setLoading] = useState(false); // Tracks if *any* loading is happening
    const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Tracks if initial data load succeeded
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('short_term');
    const [isLoading, setIsLoading] = useState(false);

    // --- React Router Hooks ---
    const navigate = useNavigate();
    const location = useLocation();

    // --- Authentication Handling ---
    useEffect(() => {
        const hash = window.location.hash;
        if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            if (accessToken) {
                window.localStorage.setItem('spotify_token', accessToken);
                setToken(accessToken);
                window.location.hash = '';
            }
        }
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        if (token && !initialLoadComplete) {
            fetchAllData();
        }
    }, [token, initialLoadComplete, timeRange]);

    const fetchAllData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [profileData, artists, tracks] = await Promise.all([
                fetchWebApi('me', 'GET'),
                fetchWebApi(`me/top/artists?time_range=${timeRange}&limit=50`, 'GET'),
                fetchWebApi(`me/top/tracks?time_range=${timeRange}&limit=50`, 'GET')
            ]);

            setProfile(profileData);
            setTopArtists(artists.items);
            setTopTracks(tracks.items);

            if (tracks.items.length > 0) {
                const recs = await getRecommendations(tracks.items);
                setRecommendations(recs.tracks);
            }
            setInitialLoadComplete(true);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to fetch data. Please try again.');
            if (error.message.includes('Invalid access token')) {
                logout();
            }
        } finally {
            setIsLoading(false);
        }
    };

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
        setToken('');
        setProfile(null);
        setTopArtists([]);
        setTopTracks([]);
        setRecommendations([]);
        setInitialLoadComplete(false);
        window.localStorage.removeItem('spotify_token');
        navigate('/');
    };

    // --- Animation Variants for Pages ---
    const pageVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.4, ease: "easeInOut" } },
        exit: { opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } }
    };

    const handleTimeRangeChange = async (newTimeRange) => {
        setTimeRange(newTimeRange);
        setIsLoading(true);
        setError(null);

        try {
            const [artists, tracks] = await Promise.all([
                fetchWebApi(`me/top/artists?time_range=${newTimeRange}&limit=20`, 'GET'),
                fetchWebApi(`me/top/tracks?time_range=${newTimeRange}&limit=20`, 'GET')
            ]);

            setTopArtists(artists.items);
            setTopTracks(tracks.items);

            if (tracks.items.length > 0) {
                const recs = await getRecommendations(tracks.items);
                setRecommendations(recs.tracks);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to fetch data. Please try again.');
            if (error.message.includes('Invalid access token')) {
                logout();
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helper Functions ---
    const formatDuration = (ms) => {
        if (typeof ms !== 'number' || ms < 0) return 'N/A';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // --- API Helper ---
    const fetchWebApi = async (endpoint, method, body = null) => {
        if (!token) {
            throw new Error('No access token available');
        }

        const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            method,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            const errorData = await res.json();
            const errorMsg = errorData?.error?.message || res.statusText;
            console.error(`API Error (${res.status}): ${errorMsg}`);
            throw new Error(`Spotify API request failed: ${errorMsg}`);
        }

        return await res.json();
    };

    const getRecommendations = async (tracks) => {
        const seed_artists = tracks.slice(0, 2).map(track => track.artists[0].id).join(',');
        const seed_tracks = tracks.slice(0, 3).map(track => track.id).join(',');
        
        return await fetchWebApi(
            `recommendations?limit=20&seed_tracks=${seed_tracks}&seed_artists=${seed_artists}`,
            'GET'
        );
    };

    // --- Render Logic ---
    return (
        <div className="App">
            <div className="logo-container">
                <img src="/spotiverse.png" alt="Spotiverse Logo" className="app-logo" />
            </div>
            
            {token && (
                <>
                    <TimeRangeSelector onTimeRangeChange={handleTimeRangeChange} />
                    <button className="logout-button" onClick={logout}>
                        Logout
                    </button>
                    <Navbar />
                </>
            )}

            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={
                        token ? (
                            <motion.div
                                key={timeRange}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="content-area">
                                    <h1 className="page-header">Your Profile</h1>
                                    <ProfilePage 
                                        profile={profile} 
                                        topArtists={topArtists} 
                                        topTracks={topTracks} 
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <LoginPage onLogin={handleLogin} />
                            </motion.div>
                        )
                    } />
                    <Route path="/profile" element={
                        <motion.div key="profile" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <div className="content-area">
                                <h1 className="page-header">Your Profile</h1>
                                <ProfilePage 
                                    profile={profile} 
                                    topArtists={topArtists} 
                                    topTracks={topTracks} 
                                />
                            </div>
                        </motion.div>
                    }/>
                    <Route path="/top-artists" element={
                        <motion.div key="top-artists" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <div className="content-area">
                                <h1 className='page-header'>Your Top Artists</h1>
                                <TopArtistsPage artists={topArtists} />
                            </div>
                        </motion.div>
                    }/>
                    <Route path="/top-tracks" element={
                        <motion.div key="top-tracks" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <div className="content-area">
                                <h1 className='page-header'>Your Top Tracks</h1>
                                <TopTracksPage 
                                    tracks={topTracks} 
                                    features={topTracksAudioFeatures} 
                                    formatDuration={formatDuration} 
                                />
                            </div>
                        </motion.div>
                    }/>
                    <Route path="/recommendations" element={
                        <motion.div key="recommendations" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <div className="content-area">
                                <h1 className="page-header">Your Recommendations</h1>
                                <RecommendationsPage recommendations={recommendations} features={recommendationsAudioFeatures} formatDuration={formatDuration} />
                            </div>
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
            </AnimatePresence>
        </div>
    );
}

export default App;
