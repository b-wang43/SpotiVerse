import React, { useState } from 'react';
import './TimeRangeSelector.css';

const TimeRangeSelector = ({ onTimeRangeChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState('short_term');

    const timeRanges = [
        { value: 'short_term', label: 'Last 4 Weeks' },
        { value: 'medium_term', label: 'Last 6 Months' },
        { value: 'long_term', label: 'Last 12 Months' }
    ];

    const handleSelect = (value) => {
        setSelectedRange(value);
        setIsOpen(false);
        onTimeRangeChange(value);
    };

    const getCurrentLabel = () => {
        return timeRanges.find(range => range.value === selectedRange)?.label || 'Select Time Range';
    };

    return (
        <div className="time-range-container">
            <button 
                className="time-range-button"
                onClick={() => setIsOpen(!isOpen)}
            >
                {getCurrentLabel()}
            </button>
            {isOpen && (
                <div className="time-range-dropdown">
                    {timeRanges.map((range) => (
                        <button
                            key={range.value}
                            className={`time-range-option ${selectedRange === range.value ? 'selected' : ''}`}
                            onClick={() => handleSelect(range.value)}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimeRangeSelector; 