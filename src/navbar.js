// src/Navbar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css'; // Ensure this CSS file exists and is imported

function Navbar() {
    return (
        <nav className="floating-navbar">
            <NavLink
                to="/"
                end
                className={({ isActive }) => isActive ? 'floating-nav-link active' : 'floating-nav-link'}
            >
                Profile
            </NavLink>
            <NavLink
                to="/top-tracks"
                className={({ isActive }) => isActive ? 'floating-nav-link active' : 'floating-nav-link'}
            >
                Tracks
            </NavLink>
            <NavLink
                to="/top-artists"
                className={({ isActive }) => isActive ? 'floating-nav-link active' : 'floating-nav-link'}
            >
                Artists
            </NavLink>
            <NavLink
                to="/recommendations"
                className={({ isActive }) => isActive ? 'floating-nav-link active' : 'floating-nav-link'}
            >
                Recommended
            </NavLink>
        </nav>
    );
}

export default Navbar;
