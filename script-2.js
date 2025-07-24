// ==UserScript==
// @name         TIDAL Social Comments (Native UI)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  A social comments overlay for TIDAL with replies, perfectly mimicking the native Play Queue UI.
// @author       Social Overlay Team
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

    // --- CONFIGURATION ---
    const SUPABASE_URL = 'https://hqfqeqrptwrnxqoifemu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZnFlcXJwdHdybnhxb2lmZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTE3NjcsImV4cCI6MjA2ODc4Nzc2N30.8g-z-cpdB90LYii6gvdE7Sb28xOnhEuuAd4A1dnkpg4';
    const LIKE_EMOJI = '👍'; // The emoji used for 'like' reactions.
    const AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptMC0xNGMtMi4yMSAwLTQgMS43OS00IDRzMS43OSA0IDQgNCA0LTEuNzkgNC00LTEuNzktNC00LTR6bTAtOEM5LjA0IDE0IDYgMTUuNzkgNiAxN2g4YzAgLTEuMjEtMy4wNC0zLTQtM3oiLz48L3N2Zz4=';

    // --- STYLES ---
    // Injected styles to mimic TIDAL's native UI for a seamless experience.
    GM_addStyle(`
        #social-comments-sidebar {
            position: fixed; top: 64px; right: 0; bottom: 90px;
            width: 388px; z-index: 9990;
            background-color: var(--wave-color-background-base-secondary, #1a1a1a);
            border-left: 1px solid var(--wave-color-border-primary, rgba(255, 255, 255, 0.1));
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; flex-direction: column;
        }
        #social-comments-sidebar._containerIsOpen_5f53707 { transform: translateX(0); }

        .social-comments-header {
            padding: 24px 24px 16px; flex-shrink: 0; display: flex;
            justify-content: space-between; align-items: center;
        }
        .social-comments-title {
            color: var(--wave-color-text-primary); font-size: 1.25rem;
            line-height: 1.4; font-weight: 700;
        }
        .social-comments-list-container {
            flex-grow: 1; overflow-y: auto; padding: 0 8px;
        }
        .social-comment-item {
            display: flex; align-items: flex-start; padding: 8px;
            border-radius: 6px; gap: 16px; animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .social-comment-item:hover { background-color: var(--wave-color-interactive-primary-hover); }

        .social-comment-avatar-container { flex-shrink: 0; width: 48px; height: 48px; }
        .social-comment-avatar-container img { width: 100%; height: 100%; border-radius: 4px; object-fit: cover; }

        .social-comment-content { flex-grow: 1; min-width: 0; }
        .social-comment-author-line {
            display: flex; align-items: baseline; gap: 8px; color: var(--wave-color-text-primary);
        }
        .social-comment-text {
            color: var(--wave-color-text-secondary); font-size: 0.875rem;
            line-height: 1.5; margin-top: 4px; word-break: break-word;
        }
        .comment-playback-time { color: var(--wave-color-text-tertiary); cursor: pointer; }
        .comment-playback-time:hover { color: var(--wave-color-text-primary); text-decoration: underline; }

        .social-comment-actions { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
        .social-action-button {
            background: none; border: none; cursor: pointer;
            color: var(--wave-color-text-tertiary); padding: 8px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .social-action-button:hover {
            background-color: var(--wave-color-interactive-primary-hover-solid);
            color: var(--wave-color-text-primary);
        }
        .social-action-button.liked { color: var(--wave-color-solid-primary-base); }
        .social-action-button.reply-btn { font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px; }

        /* Reply styles */
        .social-replies-container {
            margin-top: 12px; padding-left: 24px; margin-left: 24px;
            border-left: 2px solid var(--wave-color-border-primary, rgba(255,255,255,0.08));
            display: flex; flex-direction: column; gap: 8px;
        }
        .social-replies-container .social-comment-avatar-container { width: 32px; height: 32px; }

        .social-input-area {
            padding: 16px; border-top: 1px solid var(--wave-color-border-primary);
            background-color: var(--wave-color-background-base-secondary); flex-shrink: 0;
        }
        #replying-to-indicator {
            padding: 0px 16px 8px; color: var(--wave-color-text-secondary); font-size: 12px;
        }
        #cancel-reply-btn { background: none; border: none; color: var(--wave-color-text-tertiary); margin-left: 8px; cursor: pointer; }
        .social-input-wrapper {
            display: flex; gap: 12px; align-items: flex-start;
            background-color: var(--wave-color-interactive-primary-hover);
            border-radius: 8px; padding: 4px 4px 4px 12px;
        }
        .social-input-field {
            flex-grow: 1; background: transparent; border: none; color: var(--wave-color-text-primary);
            font-family: inherit; font-size: 14px; resize: none; padding: 8px 0; min-height: 36px;
        }
        .social-input-field:focus { outline: none; }
        .social-send-btn {
            background: var(--wave-color-solid-contrast-fill); color: var(--wave-color-solid-primary-base);
            border: none; border-radius: 6px; width: 36px; height: 36px; display: flex;
            align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s; flex-shrink: 0;
        }
        .social-send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .social-comments-button {
            color: var(--wave-color-text-secondary); background-color: transparent;
            border-radius: 4px; padding: 8px;
        }
        .social-comments-button.active {
            color: var(--wave-color-solid-primary-base);
            background-color: var(--wave-color-interactive-primary-hover-solid);
        }
        .social-comments-button:not(.active):hover { background-color: var(--wave-color-interactive-primary-hover-solid); }

        .social-state-placeholder {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100%; color: var(--wave-color-text-tertiary); text-align: center; gap: 8px;
        }
        .social-state-icon { font-size: 32px; opacity: 0.5; }
    `);

    // --- STATE & DOM ---
    let state = {
        isOpen: false, comments: [], loading: true, trackId: null, currentTime: 0,
        replyingTo: null, // { id: commentId, name: userName }
        userId: GM_getValue('social-overlay-user-id') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    GM_setValue('social-overlay-user-id', state.userId);

    let commentsSidebar, commentsList, commentInput, sendButton, commentsButton, replyingIndicator;

    // --- HELPERS ---
    const formatTime = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
    const formatRelativeTime = (dateString) => {
        const diff = (new Date() - new Date(dateString)) / 1000;
        if (diff < 60) return `now`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    };
    const formatUserId = (id) => {
        if (!id) return 'User';
        if (id.startsWith('user-')) return `User-${id.slice(-5)}`;
        return id.charAt(0).toUpperCase() + id.slice(1);
    };

    // --- API LOGIC ---
    const mapCommentData = (comment) => ({
        id: comment.id,
        user_id: comment.tidal_user_id,
        user_name: formatUserId(comment.tidal_user_id),
        avatar_url: comment.avatar_url,
        content: comment.body,
        playback_time: comment.timestamp_seconds,
        created_at: comment.created_at,
        likes_count: comment.reactions?.length || 0,
        user_liked: comment.reactions?.some(r => r.tidal_user_id === state.userId && r.emoji === LIKE_EMOJI) || false,
        replies: (comment.replies || []).map(mapCommentData),
    });

    async function fetchComments(mode = 'full') {
        if (!state.trackId) {
            state.comments = [];
            state.loading = false;
            render();
            return;
        }
        try {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${SUPABASE_URL}/functions/v1/get-thread`,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                data: JSON.stringify({ track_id: state.trackId }),
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        state.comments = (data.comments || []).map(mapCommentData);
                    } else if (response.status !== 404) {
                        console.error('Error fetching comments:', response.statusText);
                    } else {
                        state.comments = []; // 404 means no comments, which is fine
                    }
                    if (mode === 'full' || (mode === 'poll' && state.comments.length > 0)) {
                        state.loading = false;
                        render();
                    }
                },
                onerror: (err) => { throw new Error(err); }
            });
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            state.loading = false;
            render();
        }
    }

    async function postComment(content, parentId = null) {
        if (!state.trackId || !content) return;
        sendButton.disabled = true;

        const payload = {
            tidal_user_id: state.userId,
            track_id: state.trackId,
            body: content,
            timestamp_seconds: Math.floor(state.currentTime),
            ...(parentId && { parent_id: parentId })
        };

        try {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${SUPABASE_URL}/functions/v1/add-comment`,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                data: JSON.stringify(payload),
                onload: (response) => {
                    if (response.status === 201) {
                        commentInput.value = '';
                        commentInput.dispatchEvent(new Event('input')); // Trigger UI update
                        if (state.replyingTo) cancelReply();
                        fetchComments('poll'); // Refresh comments to show the new one
                    } else {
                        const err = JSON.parse(response.responseText || '{}');
                        throw new Error(err.error || 'Server error');
                    }
                },
                onerror: (err) => { throw new Error(err); },
                ontimeout: () => { throw new Error('Request timed out'); }
            });
        } catch (error) {
            console.error('Failed to post comment:', error);
            alert(`Error: ${error.message}`);
            sendButton.disabled = !commentInput.value.trim();
        }
    }

    async function toggleLike(commentId) {
        let comment = state.comments.find(c => c.id == commentId);
        if (!comment) { // Check replies
            for (const parent of state.comments) {
                comment = parent.replies.find(r => r.id == commentId);
                if (comment) break;
            }
        }
        if (!comment) return;

        const currentlyLiked = comment.user_liked;
        const endpoint = currentlyLiked ? 'remove-comment-reaction' : 'add-comment-reaction';

        // Optimistic UI update
        comment.user_liked = !currentlyLiked;
        comment.likes_count += currentlyLiked ? -1 : 1;
        renderComment(comment);

        try {
            await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${SUPABASE_URL}/functions/v1/${endpoint}`,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                    data: JSON.stringify({ tidal_user_id: state.userId, comment_id: commentId, emoji: LIKE_EMOJI }),
                    onload: res => (res.status >= 200 && res.status < 300) ? resolve(res) : reject(res),
                    onerror: reject
                });
            });
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert on failure
            comment.user_liked = currentlyLiked;
            comment.likes_count += currentlyLiked ? 1 : -1;
            renderComment(comment);
            alert('Could not update reaction. Please try again.');
        }
    }

    // --- UI & RENDERING ---
    function createSidebar() {
        const existing = document.getElementById('social-comments-sidebar');
        if (existing) return existing;

        const el = document.createElement('aside');
        el.id = 'social-comments-sidebar';
        el.className = '_container_b3e8f28'; // Native class
        el.innerHTML = `
            <div class="social-comments-header _header_f4bacf5">
                <span class="social-comments-title _title_776ac91">Comments</span>
                <button class="social-action-button" title="Close" data-action="close">
                     <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
            <div class="social-comments-list-container _playQueueItems_84488b2"></div>
            <div class="social-input-area">
                <div id="replying-to-indicator" style="display: none;"></div>
                <div class="social-input-wrapper">
                    <textarea class="social-input-field" placeholder="Add a comment..." rows="1"></textarea>
                    <button class="social-send-btn" disabled title="Send" data-action="send">
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>`;
        document.body.appendChild(el);

        // Add event listeners
        el.addEventListener('click', handleSidebarClick);
        const input = el.querySelector('.social-input-field');
        input.addEventListener('input', () => {
            el.querySelector('.social-send-btn').disabled = !input.value.trim();
            input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`;
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendButton.click(); }
        });
        return el;
    }

    function createCommentElement(comment) {
        const item = document.createElement('div');
        item.className = 'social-comment-item';
        item.dataset.id = comment.id;
        item.innerHTML = `
            <div class="social-comment-avatar-container">
                <img src="${comment.avatar_url || AVATAR_URL}" />
            </div>
            <div class="social-comment-content">
                <div class="social-comment-author-line">
                    <span class="wave-text-description-demi">${comment.user_name}</span>
                    <span class="wave-text-capital-demi" style="color: var(--wave-color-text-tertiary);">${formatRelativeTime(comment.created_at)}</span>
                </div>
                <div class="social-comment-text">
                    ${comment.content.replace(/\n/g, '<br>')}
                    ${comment.playback_time > 0 ? `<span class="comment-playback-time" data-action="seek" data-time="${comment.playback_time}" title="Jump to time"> @${formatTime(comment.playback_time)}</span>` : ''}
                </div>
                <div class="social-comment-actions">
                    <button class="social-action-button ${comment.user_liked ? 'liked' : ''}" data-action="like" data-id="${comment.id}" title="Like">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>
                        <span style="font-size: 12px; margin-left: 4px;">${comment.likes_count > 0 ? comment.likes_count : ''}</span>
                    </button>
                    <button class="social-action-button reply-btn" data-action="reply" data-id="${comment.id}" data-name="${comment.user_name}">Reply</button>
                </div>
                <div class="social-replies-container"></div>
            </div>`;
        return item;
    }

    function render() {
        if (!commentsSidebar) return;
        commentsSidebar.classList.toggle('_containerIsOpen_5f53707', state.isOpen);
        commentsButton?.classList.toggle('active', state.isOpen);
        if (!state.isOpen) return;

        if (state.loading) {
            commentsList.innerHTML = '<div class="social-state-placeholder"><div class="social-state-icon">⏳</div>Loading comments...</div>';
            return;
        }
        if (state.comments.length === 0) {
            const msg = state.trackId ? 'Be the first to comment!' : 'Play a track to see comments.';
            const icon = state.trackId ? '💬' : '🎵';
            commentsList.innerHTML = `<div class="social-state-placeholder"><div class="social-state-icon">${icon}</div>${msg}</div>`;
            return;
        }

        commentsList.innerHTML = ''; // Clear list
        state.comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            if (comment.replies && comment.replies.length > 0) {
                const repliesContainer = commentEl.querySelector('.social-replies-container');
                comment.replies.forEach(reply => {
                    repliesContainer.appendChild(createCommentElement(reply));
                });
            }
            commentsList.appendChild(commentEl);
        });
    }

    function renderComment(comment) {
        const el = commentsList.querySelector(`.social-comment-item[data-id="${comment.id}"]`);
        if (el) el.replaceWith(createCommentElement(comment));
    }

    // --- EVENT HANDLING ---
    function cancelReply() {
        state.replyingTo = null;
        replyingIndicator.style.display = 'none';
        replyingIndicator.innerHTML = '';
        commentInput.placeholder = 'Add a comment...';
    }

    function handleSidebarClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const { action, id, time, name } = target.dataset;
        switch (action) {
            case 'close': toggleCommentsPanel(); break;
            case 'send':
                const content = commentInput.value.trim();
                if (content) postComment(content, state.replyingTo?.id);
                break;
            case 'like': toggleLike(id); break;
            case 'seek': document.querySelector('audio, video')?.fastSeek(parseFloat(time)); break;
            case 'reply':
                state.replyingTo = { id, name };
                replyingIndicator.innerHTML = `Replying to <strong>${name}</strong> <button id="cancel-reply-btn" data-action="cancel-reply" title="Cancel reply">×</button>`;
                replyingIndicator.style.display = 'block';
                commentInput.placeholder = 'Write your reply...';
                commentInput.focus();
                break;
            case 'cancel-reply': cancelReply(); break;
        }
    }

    function toggleCommentsPanel() {
        state.isOpen = !state.isOpen;
        // Close TIDAL's native play queue if it's open
        if (state.isOpen && document.getElementById('playQueueSidebar')?.classList.contains('_containerIsOpen_5f53707')) {
            document.querySelector('[data-test="play-queue-button"]')?.click();
        }
        if (state.isOpen && state.trackId) fetchComments('full');
        render();
    }

    // --- INITIALIZATION & POLLING ---
    function init() {
        const playerControls = document.querySelector('._moreContainer_f6162c8, [data-test="player-controls-right"]');
        if (document.querySelector('.social-comments-button') || !playerControls) return;

        commentsButton = document.createElement('button');
        commentsButton.className = 'social-comments-button';
        commentsButton.title = 'Show Comments';
        commentsButton.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;
        commentsButton.onclick = toggleCommentsPanel;

        const playQueueButton = playerControls.querySelector('[data-test="play-queue-button"]');
        if (playQueueButton) {
            playerControls.insertBefore(commentsButton, playQueueButton);
            playQueueButton.addEventListener('click', () => { if (state.isOpen) toggleCommentsPanel(); });
        } else {
            playerControls.appendChild(commentsButton);
        }

        commentsSidebar = createSidebar();
        commentsList = commentsSidebar.querySelector('.social-comments-list-container');
        commentInput = commentsSidebar.querySelector('.social-input-field');
        sendButton = commentsSidebar.querySelector('.social-send-btn');
        replyingIndicator = commentsSidebar.querySelector('#replying-to-indicator');

        console.log('TIDAL Social Comments initialized!');
    }

    let lastTrackId = null;
    function pollForChanges() {
        if (!document.querySelector('.social-comments-button')) init();

        const urlMatch = window.location.pathname.match(/track\/(\d+)/);
        const newTrackId = urlMatch ? urlMatch[1] : null;
        state.currentTime = document.querySelector('audio, video')?.currentTime || 0;

        if (newTrackId !== lastTrackId) {
            lastTrackId = newTrackId;
            state.trackId = newTrackId;
            state.loading = true;
            state.comments = [];
            if (state.isOpen) fetchComments('full');
            render(); // Render loading/empty state immediately
        }
    }

    // Poll for track changes and UI initialization
    setInterval(pollForChanges, 1000);
    // Poll for new comments when panel is open
    setInterval(() => {
        if (state.isOpen && state.trackId && !state.loading) {
            fetchComments('poll');
        }
    }, 5000);

    // Initial setup observer
    const observer = new MutationObserver(() => {
        if (document.querySelector('._moreContainer_f6162c8, [data-test="player-controls-right"]')) {
            init();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();