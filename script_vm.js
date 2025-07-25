// ==UserScript==
// @name         TIDAL Social Comments with Heatmap
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Social comments overlay for TIDAL with heatmap visualization
// @author       You
// @match        https://*.tidal.com/*
// @icon         https://tidal.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      hqfqeqrptwrnxqoifemu.supabase.co
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const SUPABASE_URL = 'https://hqfqeqrptwrnxqoifemu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZnFlcXJwdHdybnhxb2lmZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTE3NjcsImV4cCI6MjA2ODc4Nzc2N30.8g-z-cpdB90LYii6gvdE7Sb28xOnhEuuAd4A1dnkpg4';
    const AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+';

    // State
    let state = {
        isOpen: false,
        comments: [],
        loading: false,
        trackId: null,
        currentTime: 0,
        userId: GM_getValue('user-id') || 'user-' + Date.now(),
        heatmapData: [],
        trackDuration: 0
    };
    
    GM_setValue('user-id', state.userId);

    // Add styles
    GM_addStyle(`
        #tidal-comments-sidebar {
            position: fixed;
            top: 64px;
            right: 0;
            bottom: 90px;
            width: 350px;
            background: #1a1a1a;
            border-left: 1px solid #333;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #tidal-comments-sidebar.open {
            transform: translateX(0);
        }
        
        .tc-header {
            padding: 20px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .tc-title {
            font-size: 18px;
            font-weight: 600;
        }
        
        .tc-close {
            background: none;
            border: none;
            color: #999;
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
        }
        
        .tc-close:hover {
            color: white;
        }
        
        .tc-heatmap-container {
            padding: 15px 20px;
            border-bottom: 1px solid #333;
        }
        
        .tc-heatmap-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #ccc;
        }
        
        .tc-heatmap {
            height: 20px;
            background: #333;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
        }
        
        .heat-segment {
            position: absolute;
            height: 100%;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .heat-segment:hover {
            transform: scaleY(1.2);
        }
        
        .heat-tooltip {
            position: absolute;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            background: #000;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            z-index: 10;
        }
        
        .heat-segment:hover .heat-tooltip {
            opacity: 1;
        }
        
        .tc-comments-list {
            flex: 1;
            overflow-y: auto;
            padding: 0 10px;
        }
        
        .tc-comment {
            display: flex;
            padding: 15px 10px;
            border-bottom: 1px solid #333;
            gap: 12px;
            transition: background 0.2s;
        }
        
        .tc-comment:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .tc-comment.highlighted {
            background: rgba(0, 122, 204, 0.2);
            border-left: 3px solid #007acc;
        }
        
        .tc-avatar {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background: #333;
        }
        
        .tc-content {
            flex: 1;
        }
        
        .tc-user {
            font-weight: 600;
            color: #4CAF50;
            font-size: 14px;
        }
        
        .tc-time {
            color: #007acc;
            font-size: 12px;
            margin-left: 8px;
            cursor: pointer;
        }
        
        .tc-time:hover {
            text-decoration: underline;
        }
        
        .tc-text {
            margin: 5px 0;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .tc-actions {
            display: flex;
            gap: 10px;
            margin-top: 5px;
        }
        
        .tc-action {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .tc-action:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        
        .tc-input-area {
            padding: 20px;
            border-top: 1px solid #333;
        }
        
        .tc-input {
            width: 100%;
            background: #333;
            border: 1px solid #555;
            color: white;
            padding: 10px;
            border-radius: 6px;
            font-size: 14px;
            resize: none;
            min-height: 40px;
        }
        
        .tc-input:focus {
            outline: none;
            border-color: #007acc;
        }
        
        .tc-send {
            background: #007acc;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            margin-top: 10px;
            cursor: pointer;
            font-weight: 600;
        }
        
        .tc-send:hover {
            background: #0056b3;
        }
        
        .tc-send:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .tc-button {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
        }
        
        .tc-button:hover {
            background: rgba(255,255,255,0.1);
        }
        
        .tc-button.active {
            color: #007acc;
            background: rgba(0, 122, 204, 0.2);
        }
        
        .tc-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            text-align: center;
        }
        
        .tc-placeholder-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }
    `);

    // Helper functions
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatUserId = (id) => {
        if (!id) return 'User';
        return `User-${id.slice(-5)}`;
    };

    // Heatmap functions
    function generateHeatmapData() {
        if (!state.trackId || state.comments.length === 0) {
            state.heatmapData = [];
            return;
        }

        const mediaElement = document.querySelector('audio, video');
        state.trackDuration = mediaElement?.duration || 210;

        const segmentSize = 15;
        const segments = Math.ceil(state.trackDuration / segmentSize);
        const commentCounts = new Array(segments).fill(0);

        state.comments.forEach(comment => {
            if (comment.playback_time >= 0) {
                const segmentIndex = Math.floor(comment.playback_time / segmentSize);
                if (segmentIndex < segments) {
                    commentCounts[segmentIndex]++;
                }
            }
        });

        const maxCount = Math.max(...commentCounts, 1);

        state.heatmapData = commentCounts.map((count, index) => ({
            startTime: index * segmentSize,
            endTime: Math.min((index + 1) * segmentSize, state.trackDuration),
            count,
            intensity: count / maxCount
        }));
    }

    function renderHeatmap() {
        const heatmapContainer = document.querySelector('.tc-heatmap');
        if (!heatmapContainer) return;

        heatmapContainer.innerHTML = '';

        if (state.heatmapData.length === 0) {
            heatmapContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 10px;">No comments yet</div>';
            return;
        }

        state.heatmapData.forEach((segment) => {
            const segmentEl = document.createElement('div');
            segmentEl.className = 'heat-segment';

            const hue = Math.max(0, 240 - (segment.intensity * 240));
            const saturation = Math.min(100, 50 + (segment.intensity * 50));
            const lightness = Math.min(60, 30 + (segment.intensity * 30));

            segmentEl.style.cssText = `
                left: ${(segment.startTime / state.trackDuration) * 100}%;
                width: ${((segment.endTime - segment.startTime) / state.trackDuration) * 100}%;
                background: hsl(${hue}, ${saturation}%, ${lightness}%);
                opacity: ${0.4 + (segment.intensity * 0.6)};
            `;

            const tooltip = document.createElement('div');
            tooltip.className = 'heat-tooltip';
            tooltip.textContent = `${formatTime(segment.startTime)}-${formatTime(segment.endTime)}: ${segment.count} comments`;
            segmentEl.appendChild(tooltip);

            segmentEl.addEventListener('click', () => {
                highlightCommentsInRange(segment.startTime, segment.endTime);
            });

            heatmapContainer.appendChild(segmentEl);
        });
    }

    function highlightCommentsInRange(startTime, endTime) {
        document.querySelectorAll('.tc-comment').forEach(el => {
            el.classList.remove('highlighted');
        });

        state.comments.forEach((comment, index) => {
            if (comment.playback_time >= startTime && comment.playback_time < endTime) {
                const commentEl = document.querySelector(`[data-comment-id="${comment.id}"]`);
                if (commentEl) {
                    commentEl.classList.add('highlighted');
                }
            }
        });

        setTimeout(() => {
            document.querySelectorAll('.tc-comment').forEach(el => {
                el.classList.remove('highlighted');
            });
        }, 3000);
    }

    // Mock data for demo
    const mockComments = [
        { id: 1, user_id: 'user1', content: 'This beat is fire! 🔥', playback_time: 30, created_at: new Date().toISOString() },
        { id: 2, user_id: 'user2', content: 'Love this part', playback_time: 75, created_at: new Date().toISOString() },
        { id: 3, user_id: 'user3', content: 'Producer went OFF', playback_time: 165, created_at: new Date().toISOString() },
        { id: 4, user_id: 'user4', content: 'Getting chills', playback_time: 45, created_at: new Date().toISOString() },
        { id: 5, user_id: 'user5', content: 'Best song ever', playback_time: 120, created_at: new Date().toISOString() }
    ];

    // API functions (using mock data for demo)
    function fetchComments() {
        if (!state.trackId) return;
        
        state.loading = true;
        // Simulate API call
        setTimeout(() => {
            state.comments = mockComments;
            generateHeatmapData();
            state.loading = false;
            render();
        }, 500);
    }

    function postComment(content) {
        if (!content.trim()) return;

        const newComment = {
            id: Date.now(),
            user_id: state.userId,
            content: content,
            playback_time: Math.floor(state.currentTime),
            created_at: new Date().toISOString()
        };

        state.comments.unshift(newComment);
        generateHeatmapData();
        render();

        // Clear input
        const input = document.querySelector('.tc-input');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input'));
        }
    }

    // UI functions
    function createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'tidal-comments-sidebar';
        sidebar.innerHTML = `
            <div class="tc-header">
                <div class="tc-title">💬 Comments</div>
                <button class="tc-close" onclick="window.tidalComments.close()">×</button>
            </div>
            <div class="tc-heatmap-container">
                <div class="tc-heatmap-title">🔥 Comment Heatmap</div>
                <div class="tc-heatmap"></div>
            </div>
            <div class="tc-comments-list"></div>
            <div class="tc-input-area">
                <textarea class="tc-input" placeholder="Add a comment at current time..." rows="2"></textarea>
                <button class="tc-send" onclick="window.tidalComments.send()">Send</button>
            </div>
        `;
        document.body.appendChild(sidebar);

        // Add input event listener
        const input = sidebar.querySelector('.tc-input');
        const sendBtn = sidebar.querySelector('.tc-send');
        
        input.addEventListener('input', () => {
            sendBtn.disabled = !input.value.trim();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.value.trim()) {
                    postComment(input.value);
                }
            }
        });

        return sidebar;
    }

    function render() {
        const sidebar = document.getElementById('tidal-comments-sidebar');
        if (!sidebar) return;

        sidebar.classList.toggle('open', state.isOpen);

        if (!state.isOpen) return;

        renderHeatmap();

        const commentsList = sidebar.querySelector('.tc-comments-list');
        if (!commentsList) return;

        if (state.loading) {
            commentsList.innerHTML = '<div class="tc-placeholder"><div class="tc-placeholder-icon">⏳</div>Loading...</div>';
            return;
        }

        if (state.comments.length === 0) {
            commentsList.innerHTML = '<div class="tc-placeholder"><div class="tc-placeholder-icon">💬</div>Be the first to comment!</div>';
            return;
        }

        commentsList.innerHTML = '';
        state.comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'tc-comment';
            commentEl.setAttribute('data-comment-id', comment.id);
            
            commentEl.innerHTML = `
                <img class="tc-avatar" src="${AVATAR_URL}" alt="Avatar">
                <div class="tc-content">
                    <div>
                        <span class="tc-user">${formatUserId(comment.user_id)}</span>
                        <span class="tc-time" onclick="window.tidalComments.seekTo(${comment.playback_time})">@${formatTime(comment.playback_time)}</span>
                    </div>
                    <div class="tc-text">${comment.content}</div>
                    <div class="tc-actions">
                        <button class="tc-action">👍 Like</button>
                        <button class="tc-action">💬 Reply</button>
                    </div>
                </div>
            `;
            
            commentsList.appendChild(commentEl);
        });
    }

    function createButton() {
        const playerControls = document.querySelector('[data-test="player-controls-right"], ._moreContainer_f6162c8');
        if (!playerControls || document.querySelector('.tc-button')) return;

        const button = document.createElement('button');
        button.className = 'tc-button';
        button.title = 'Show Comments';
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
        `;
        
        button.addEventListener('click', () => {
            state.isOpen = !state.isOpen;
            button.classList.toggle('active', state.isOpen);
            if (state.isOpen && state.comments.length === 0) {
                fetchComments();
            }
            render();
        });

        playerControls.appendChild(button);
    }

    // Track monitoring
    function getCurrentTrackId() {
        const footerLink = document.querySelector('#footerPlayer a[href*="/track/"]');
        return footerLink?.getAttribute('href')?.match(/\/track\/(\d+)/)?.[1] || null;
    }

    function getCurrentTime() {
        const mediaElement = document.querySelector('audio, video');
        return mediaElement?.currentTime || 0;
    }

    // Global functions
    window.tidalComments = {
        close: () => {
            state.isOpen = false;
            const button = document.querySelector('.tc-button');
            if (button) button.classList.remove('active');
            render();
        },
        send: () => {
            const input = document.querySelector('.tc-input');
            if (input && input.value.trim()) {
                postComment(input.value);
            }
        },
        seekTo: (time) => {
            const mediaElement = document.querySelector('audio, video');
            if (mediaElement) {
                mediaElement.currentTime = time;
            }
        }
    };

    // Initialize
    function init() {
        createButton();
        createSidebar();
        
        // Monitor track changes
        let lastTrackId = null;
        setInterval(() => {
            const newTrackId = getCurrentTrackId();
            state.currentTime = getCurrentTime();
            
            if (newTrackId !== lastTrackId) {
                lastTrackId = newTrackId;
                state.trackId = newTrackId;
                state.comments = [];
                state.heatmapData = [];
                
                if (state.isOpen) {
                    fetchComments();
                } else {
                    render();
                }
            }
        }, 1000);
    }

    // Wait for page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }

    // Re-initialize if needed
    const observer = new MutationObserver(() => {
        if (document.querySelector('[data-test="player-controls-right"], ._moreContainer_f6162c8') && !document.querySelector('.tc-button')) {
            init();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();