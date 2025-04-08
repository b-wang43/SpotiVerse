import React, { useState, useEffect } from 'react';
import './App.css';

//Configuration
const CLIENT_ID = 'bbc74db9fb9243f595ad6eb98f082b79';
const REDIRECT_URI = 'http://localhost:3000'; 
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';
const SCOPES = [
    'user-read-private',         // Read user profile
    'user-top-read',             // Read top artists and tracks
    'user-read-recently-played', // Needed for recommendations seed sometimes
];
const SCOPES_URL_PARAM = SCOPES.join('%20');
//Spotify API helper
async function fetchWebApi(endpoint, method, token, body = null) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        method,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        // Basic error handling
        const errorDetails = await res.json().catch(() => ({ error: { message: 'Failed to parse error JSON' } }));
        console.error(`API Error (${res.status}): ${errorDetails?.error?.message || res.statusText}`);
        throw new Error(`Spotify API request failed: ${res.statusText}`);
    }
    // Handle cases where response might be empty (e.g., 204 No Content)
    if (res.status === 204) {
        return null;
    }
    return await res.json();
}
//React Component
function App() {
    const [token, setToken] = useState(null);
    const [profile, setProfile] = useState(null);
    const [topArtists, setTopArtists] = useState(null);
    const [topTracks, setTopTracks] = useState(null);
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    //User Authentication
    useEffect(() => {
        const hash = window.location.hash;
        let localToken = window.localStorage.getItem('spotify_token');
        let tokenExpiry = window.localStorage.getItem('spotify_token_expiry');
        // Clear hash from URL bar
        if (hash) {
            window.history.pushState("", document.title, window.location.pathname + window.location.search);
        }
        // Check URL Hash for new token (after redirect)
        if (!localToken && hash) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const expiresIn = params.get('expires_in');
            if (accessToken && expiresIn) {
                const expiryTime = new Date().getTime() + parseInt(expiresIn) * 1000;
                window.localStorage.setItem('spotify_token', accessToken);
                window.localStorage.setItem('spotify_token_expiry', expiryTime.toString());
                localToken = accessToken;
                tokenExpiry = expiryTime.toString();
                console.log("New token obtained from URL hash.");
                setToken(accessToken);
            }
        }
        // Check Local Storage for existing, non-expired token
        if (localToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
             console.log("Using valid token from local storage.");
            setToken(localToken);
        } else if (localToken) {
            // Token expired or invalid
            console.log("Token found in local storage has expired.");
            logout();
        }
    }, []);
    //data fetching
    useEffect(() => {
        if (token) {
            console.log("Token available, attempting to fetch data...");
            setLoading(true);
            setError(null);
            const fetchData = async () => {
                try {
                    // Fetch User Profile
                    console.log("Fetching profile...");
                    const userProfile = await fetchWebApi('v1/me', 'GET', token);
                    setProfile(userProfile);
                    console.log("Profile fetched:", userProfile);
                    // Fetch Top Artists
                    console.log("Fetching top artists...");
                    const artistsData = await fetchWebApi('v1/me/top/artists?time_range=medium_term&limit=20', 'GET', token);
                    setTopArtists(artistsData.items);
                    console.log("Top artists fetched:", artistsData.items);
                    // Fetch Top Tracks
                    console.log("Fetching top tracks...");
                    const tracksData = await fetchWebApi('v1/me/top/tracks?time_range=medium_term&limit=20', 'GET', token);
                    setTopTracks(tracksData.items);
                    console.log("Top tracks fetched:", tracksData.items);
                    // Fetch Recommendations (based on top artists/tracks)
                    // Fetch Recommendations (based on top artists/tracks)
                    // Ensure seed data exists
                    const topArtistItems = artistsData?.items || [];
                    const topTrackItems = tracksData?.items || [];
                    if (topArtistItems.length > 0 || topTrackItems.length > 0) {
                        console.log("Fetching recommendations...");
                        // Get potential seeds, making sure IDs are valid strings
                        const artistSeeds = topArtistItems
                            .slice(0, 2)
                            .map(artist => artist?.id)
                            .filter(id => id);
                        const trackSeeds = topTrackItems
                            .slice(0, 3)
                            .map(track => track?.id)
                            .filter(id => id); 
                        const queryParams = new URLSearchParams({ limit: '10' });
                        if (artistSeeds.length > 0) {
                            queryParams.append('seed_artists', artistSeeds.join(','));
                        }
                        if (trackSeeds.length > 0) {
                            const remainingSeedSlots = 5 - artistSeeds.length;
                            if (remainingSeedSlots > 0) {
                                queryParams.append('seed_tracks', trackSeeds.slice(0, remainingSeedSlots).join(','));
                            }
                        }
                        if (queryParams.has('seed_artists') || queryParams.has('seed_tracks')) {
                            try {
                                const recommendationsData = await fetchWebApi(
                                    `v1/recommendations?${queryParams.toString()}`,
                                    'GET',
                                    token
                                );
                                setRecommendations(recommendationsData.tracks);
                                console.log("Recommendations fetched:", recommendationsData.tracks);
                            } catch (recommendationError) {
                                console.error("Error fetching recommendations:", recommendationError);
                                setRecommendations([]);
                            }
                        } else {
                            console.log("Not enough valid seed data (artists/tracks) found for recommendations.");
                            setRecommendations([]);
                        }
                    } else {
                        console.log("No top artists or tracks found to seed recommendations.");
                        setRecommendations([]);
                    }
                } catch (err) {
                    console.error("Error fetching data:", err);
                    setError(err.message || 'An error occurred while fetching data.');
                    if (err.message.includes('401') || err.message.includes('token') || err.message.includes('Unauthorized')) {
                         console.log("token issue, logging out.");
                         logout();
                    }
                } finally {
                    console.log("Data fetching complete.");
                    setLoading(false);
                }
            };
            fetchData();
        } else {
            console.log("No token available, skipping data fetch.");
        }
    }, [token]);
    const handleLogin = () => {
        if (!CLIENT_ID) {
             alert('Error: Spotify Client ID is not configured. Please update src/App.js');
             return;
        }
        const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES_URL_PARAM}&response_type=${RESPONSE_TYPE}&show_dialog=true`;
        window.location.href = authUrl;
    };
    const logout = () => {
        console.log("Logging out...");
        setToken(null);
        setProfile(null);
        setTopArtists(null);
        setTopTracks(null);
        setRecommendations(null);
        setError(null);
        window.localStorage.removeItem('spotify_token');
        window.localStorage.removeItem('spotify_token_expiry');
         window.location.href = window.location.origin + window.location.pathname;
    };
    return (
        <div className="App">
            <header className="App-header">
                <img src = "spotiverse.png"></img>
                {!token ? (
                    <button onClick={handleLogin}>Connect Spotify</button>
                ) : (
                    <button onClick={logout}>Logout</button>
                )}
            </header>
            <main>
                {loading && <p>Loading data...</p>}
                {error && <p className="error">Error: {error}</p>}
                {!token && !loading && (
                    <p>Please connect your Spotify account to see your stats.</p>
                )}
                {token && !loading && !error && profile && (
                    <div className="user-profile fade-in-section">
                         <h2>Welcome to your SpotiVerse, {profile.display_name}!</h2>
                         {profile.images?.[0]?.url && (
                            <img src={profile.images[0].url} alt="Profile" width={100} style={{ borderRadius: '50%' }} />
                         )}
                         <p><a href={profile.external_urls.spotify} target="_blank" rel="noopener noreferrer">View Profile on Spotify</a></p>
                    </div>
                )}
                {token && !loading && !error && topArtists && (
                    <section className="stats-section fade-in-section">
                        <h2>Your Top Artists (Last 6 months) </h2>
                        {topArtists.length > 0 ? (
                            <ul>
                                {topArtists.map((artist) => (
                                    <li key={artist.id}>
                                        {artist.images?.[2]?.url && <img src={artist.images[2].url} alt={artist.name} width={50} height={50} />}
                                        <a href={artist.external_urls.spotify} target="_blank" rel="noopener noreferrer">{artist.name}</a> <div>({artist.genres.join(', ')})</div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>No top artists data available for this time range.</p>}
                    </section>
                )}
                 {token && !loading && !error && topTracks && (
                    <section className="stats-section fade-in-section">
                        <h2>Your Top Tracks (Last 6 Months) </h2>
                        {topTracks.length > 0 ? (
                             <ul>
                                {topTracks.map((track) => (
                                    <li key={track.id}>
                                        {track.album.images?.[2]?.url && <img src={track.album.images[2].url} alt={track.album.name} width={50} height={50} />}
                                        <a href={track.external_urls.spotify} target="_blank" rel="noopener noreferrer">{track.name}</a>  <div>{track.artists.map(artist => artist.name).join(', ')}</div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>No top tracks data available for this time range.</p>}
                    </section>
                )}
                 {token && !loading && !error && recommendations && (
                    <section className="stats-section fade-in-section">
                        <h2>Recommended Songs For You</h2>
                         {recommendations.length > 0 ? (
                            <ul>
                                {recommendations.map((track) => (
                                    <li key={track.id}>
                                         {track.album.images?.[2]?.url && <img src={track.album.images[2].url} alt={track.album.name} width={50} height={50} />}
                                        <a href={track.external_urls.spotify} target="_blank" rel="noopener noreferrer">{track.name}</a> by {track.artists.map(artist => artist.name).join(', ')}
                                    </li>
                                ))}
                            </ul>
                        ): <p>Couldn't generate recommendations based on your current top items.</p>}
                    </section>
                )}
            </main>
        </div>
    );
}

export default App;