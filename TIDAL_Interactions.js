// ==UserScript==
// @name         TIDAL Social Comments (Native UI - Full Features)
// @namespace    http://tampermonkey.net/
// @version      6.3
// @description  A social comments overlay for TIDAL with sorting and collapsible nested replies (1-level), perfectly mimicking the native Play Queue UI.
// @author       Social Overlay Team (Merged Implementation)
// @match        https://*.tidal.com/*
// @icon         https://tidal.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      hqfqeqrptwrnxqoifemu.supabase.co
// @run-at       document-end
// ==/UserScript==
let lastKnownCommentId = null;
let lastKnownReplyId = null;

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const SUPABASE_URL = 'https://hqfqeqrptwrnxqoifemu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZnFlcXJwdHdybnhxb2lmZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTE3NjcsImV4cCI6MjA2ODc4Nzc2N30.8g-z-cpdB90LYii6gvdE7Sb28xOnhEuuAd4A1dnkpg4';
    const LIKE_EMOJI = '👍';
    const AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptMC0xNGMtMi4yMSAwLTQgMS43OS00IDRzMS43OSA0IDQgNCA0LTEuNzkgNC00LTEuNzktNC00LTR6bTAtOEM5LjA0IDE0IDYgMTUuNzkgNiAxN2g4YzAgLTEuMjEtMy4wNC0zLTQtM3oiLz48L3N2Zz4=';

    // --- NATIVE STYLES (MERGED) ---
    GM_addStyle(`
        /* Main sidebar container */
        #social-comments-sidebar {
            position: fixed; top: 64px; right: 0; bottom: 90px; width: 388px; z-index: 9990;
            background-color: var(--wave-color-background-base-secondary, #1a1a1a);
            border-left: 1px solid var(--wave-color-border-primary, rgba(255, 255, 255, 0.1));
            transform: translateX(100%); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; flex-direction: column;
        }
        #social-comments-sidebar._containerIsOpen_5f53707 { transform: translateX(0); }

        /* Header with sorting controls */
        .social-comments-header {
            padding: 24px 24px 16px; flex-shrink: 0; display: flex;
            justify-content: space-between; align-items: center;
        }
        .social-comments-title {
            color: var(--wave-color-text-primary); font-size: 1.25rem;
            line-height: 1.4; font-weight: 700;
        }
        .social-header-controls { display: flex; align-items: center; gap: 8px; }
        .social-sort-select {
            background: var(--wave-color-background-base-secondary);
            color: var(--wave-color-text-primary); border: 1px solid var(--wave-color-border-primary);
            border-radius: 4px; padding: 4px 8px; font-size: 12px;
        }

        /* Comments list */
        .social-comments-list-container { flex-grow: 1; overflow-y: auto; padding: 0 8px; }
        .social-comment-item {
            display: flex; align-items: flex-start; padding: 8px; border-radius: 6px; gap: 16px;
            animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .social-comment-item:hover { background-color: var(--wave-color-interactive-primary-hover); }

        /* Avatar */
        .social-comment-avatar-container { flex-shrink: 0; width: 48px; height: 48px; }
        .social-comment-avatar-container img { width: 100%; height: 100%; border-radius: 4px; object-fit: cover; }

        /* Comment content */
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

        /* Actions */
        .social-comment-actions { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
        .social-action-button {
            background: none; border: none; cursor: pointer; color: var(--wave-color-text-tertiary);
            padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .social-action-button:hover {
            background-color: var(--wave-color-interactive-primary-hover-solid);
            color: var(--wave-color-text-primary);
        }
        .social-action-button.liked { color: var(--wave-color-solid-primary-base); }
        .social-action-button.reply-btn {
            font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px;
        }

        /* Reply styles */
        .social-replies-container {
            margin-top: 12px; padding-left: 24px; margin-left: 24px;
            border-left: 2px solid var(--wave-color-border-primary, rgba(255,255,255,0.08));
            display: flex; flex-direction: column; gap: 8px;
        }
        .social-replies-container .social-comment-avatar-container { width: 32px; height: 32px; }

        /* Styles for collapsing replies */
        .social-replies-container.collapsed {
            display: none;
        }
        .replies-toggle-button {
            background: none; border: none; font-family: inherit;
            color: var(--wave-color-text-secondary);
            cursor: pointer; padding: 4px 8px; font-size: 12px;
            font-weight: 600; border-radius: 4px; margin-top: 8px;
        }
        .replies-toggle-button:hover {
            color: var(--wave-color-text-primary);
            background-color: var(--wave-color-interactive-primary-hover-solid);
        }


        /* Input area */
        .social-input-area {
            padding: 16px; border-top: 1px solid var(--wave-color-border-primary);
            background-color: var(--wave-color-background-base-secondary); flex-shrink: 0;
        }
        #replying-to-indicator {
            padding: 0px 16px 8px; color: var(--wave-color-text-secondary); font-size: 12px;
        }
        #cancel-reply-btn {
            background: none; border: none; color: var(--wave-color-text-tertiary);
            margin-left: 8px; cursor: pointer;
        }
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

        /* Button styles */
        .social-comments-button {
            color: var(--wave-color-text-secondary); background-color: transparent;
            border-radius: 4px; padding: 8px;
        }
        .social-comments-button.active {
            color: var(--wave-color-solid-primary-base);
            background-color: var(--wave-color-interactive-primary-hover-solid);
        }
        .social-comments-button:not(.active):hover {
            background-color: var(--wave-color-interactive-primary-hover-solid);
        }

        /* State placeholders */
        .social-state-placeholder {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100%; color: var(--wave-color-text-tertiary); text-align: center; gap: 8px;
        }
        .social-state-icon { font-size: 32px; opacity: 0.5; }

        /* Stuff for comment / reply deletion */
        .social-action-button.delete-btn {
        color: var(--wave-color-text-tertiary);
        }
        .social-action-button.delete-btn:hover {
        color: #ff4444; /* Red color on hover */
        }
    `);

    // --- STATE MANAGEMENT (MERGED) ---
    let state = {
        isOpen: false,
        comments: [],
        loading: true,
        trackId: null,
        currentTime: 0,
        sortMode: 'most_engagement',
        lastFetchedSecond: -1,
        replyingTo: null, // { id: commentId, name: userName }
        userId: GM_getValue('social-overlay-user-id') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        registered: false,
        // MODIFICATION: Add cache for all comments when in "Live Timestamp" mode
        allTimestampComments: [],
    };
    GM_setValue('social-overlay-user-id', state.userId);

    // --- DOM ELEMENTS ---
    let commentsSidebar, commentsList, commentInput, sendButton, commentsButton, replyingIndicator;

    // --- HELPERS ---
    const formatTime = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
    function formatRelativeTime(dateString) {
        const diff = (new Date() - new Date(dateString)) / 1000;
        if (diff < 60) return `now`;
        
        const minutes = Math.floor(diff / 60);
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(diff / 3600);
        if (hours < 24) return `${hours}h`;
        
        const days = Math.floor(diff / 86400);
        return `${days}d`;
    }
    function formatUserId(id) {
        if (!id) return 'User';
        if (id.includes('-')) {
            const parts = id.split('-');
            return `User-${parts[parts.length - 1].substring(0, 5)}`;
        }
        return id.charAt(0).toUpperCase() + id.slice(1);
    }

    // --- API LOGIC (MERGED) ---
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

    // MODIFICATION: Updated fetchComments to handle "Live Timestamp" mode correctly
    async function fetchComments(options = {}) {
        if (!state.trackId) {
            state.comments = [];
            state.allTimestampComments = [];
            state.loading = false;
            render();
            return;
        }

        const payload = {
            track_id: state.trackId,
            // When in timestamp mode, we need all comments sorted chronologically to filter on the client.
            // So we request them from the backend as 'earliest'.
            sort_by: state.sortMode === 'timestamp' ? 'earliest' : state.sortMode,
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: `${SUPABASE_URL}/functions/v1/get-thread`,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            data: JSON.stringify(payload),
            onload: function(response) {
                let newComments = [];
                if (response.status === 200) {
                    const responseData = JSON.parse(response.responseText);
                    newComments = (responseData.comments || []).map(mapCommentData);
                } else if (response.status !== 404) {
                    console.error('Error fetching comments:', response);
                }

                // If in timestamp mode, cache the full list and filter for the initial view.
                // The interval will handle subsequent updates as the song plays.
                if (state.sortMode === 'timestamp') {
                    state.allTimestampComments = newComments;
                    state.comments = state.allTimestampComments.filter(
                        c => c.playback_time <= state.currentTime
                    );
                } else {
                    // For all other modes, just update the comments list directly.
                    state.comments = newComments;
                    state.allTimestampComments = []; // Clear the cache if not in use.
                }

                state.loading = false;
                render();
            },
            onerror: function(error) {
                console.error('Error fetching comments:', error);
                state.loading = false;
                render();
            }
        });

        // This part remains the same, checking for updates for polling modes
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${SUPABASE_URL}/functions/v1/check-update-ts`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            data: JSON.stringify({ track_id: state.trackId }),
            onload: function (res) {
                if (res.status === 200) {
                    try {
                        const { latest_comment_id, latest_reply_id } = JSON.parse(res.responseText);
                        lastKnownCommentId = latest_comment_id ?? null;
                        lastKnownReplyId = latest_reply_id ?? null;
                    } catch (err) { console.error('Error parsing check-updates response:', err); }
                } else { console.error('check-updates failed after fetchComments', res); }
            },
            onerror: function (err) { console.error('Network error calling check-updates:', err); }
        });
    }

    // --- USER REGISTRATION ---
    function registerUserOnce() {
        // if we’ve already registered in this session, skip
        if (state.userRegistered) return Promise.resolve();
  
        return new Promise(resolve => {
          GM_xmlhttpRequest({
            method: 'POST',
            url: `${SUPABASE_URL}/functions/v1/add-user`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            data: JSON.stringify({
              tidal_user_id: state.userId,
              avatar_url: null
            }),
            onload: res => {
              if (res.status === 200 || res.status === 201) {
                state.userRegistered = true;
                console.log('[SC] userRegistered → true');
              } else {
                console.warn('[SC] add-user returned', res.status);
              }
              resolve();
            },
            onerror: err => {
              console.error('[SC] add-user network error', err);
              resolve();
            }
          });
        });
      }

    async function postComment(content, parentId = null) {
        await registerUserOnce();

        if (!state.trackId || !content) return;
        sendButton.disabled = true;

        const isReply = parentId !== null;
        let endpoint = isReply ? 'add-reply' : 'add-comment';
        const payload = isReply ? {
            tidal_user_id: state.userId,
            parent_comment_id: parentId,
            body: content
        } : {
            tidal_user_id: state.userId,
            track_id: state.trackId,
            body: content,
            timestamp_seconds: Math.floor(state.currentTime)
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: `${SUPABASE_URL}/functions/v1/${endpoint}`,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status === 201) {
                    commentInput.value = '';
                    commentInput.dispatchEvent(new Event('input'));
                    if (state.replyingTo) cancelReply();
                    fetchComments(); // Refetch comments after posting
                } else {
                    const errorResponse = JSON.parse(response.responseText || '{}');
                    console.error(`Failed to post ${isReply ? 'reply' : 'comment'}:`, response.status, errorResponse.error);
                    alert(`Error: Could not post ${isReply ? 'reply' : 'comment'}. ${errorResponse.error || 'Please try again.'}`);
                }
                 sendButton.disabled = !commentInput.value.trim();
            },
            onerror: function(error) {
                console.error(`Network error while posting ${isReply ? 'reply' : 'comment'}:`, error);
                alert('A network error occurred. Please check your connection and try again.');
                sendButton.disabled = !commentInput.value.trim();
            }
        });
    }

    async function deleteComment(commentId) {
        if (!commentId) return;
        let comment = state.comments.find(c => c.id == commentId) || state.allTimestampComments.find(c => c.id == commentId);
        let isReply = false;

        if (!comment) {
            for (const parent of (state.sortMode === 'timestamp' ? state.allTimestampComments : state.comments)) {
                comment = parent.replies.find(r => r.id == commentId);
                if (comment) { isReply = true; break; }
            }
        }
        if (!comment || !confirm(`Are you sure you want to delete this ${isReply ? 'reply' : 'comment'}?`)) return;

        const endpoint = isReply ? 'remove-reply' : 'remove-comment';
        try {
            await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${SUPABASE_URL}/functions/v1/${endpoint}`,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                    data: JSON.stringify({ id: commentId }),
                    onload: res => res.status === 200 ? resolve(res) : reject(new Error(JSON.parse(res.responseText || '{}').error)),
                    onerror: reject
                });
            });
            fetchComments(); // Refresh list on success
        } catch (error) {
            console.error(`Error deleting ${isReply ? 'reply' : 'comment'}:`, error);
            alert(`Error: Could not delete ${isReply ? 'reply' : 'comment'}. ${error.message || 'Please try again.'}`);
        }
    }


    async function toggleLike(commentId) {
        let commentPool = state.sortMode === 'timestamp' ? state.allTimestampComments : state.comments;
        let comment = commentPool.find(c => c.id == commentId);
        let isReply = false;

        if (!comment) {
            for (const parent of commentPool) {
                comment = parent.replies.find(r => r.id == commentId);
                if (comment) { isReply = true; break; }
            }
        }
        if (!comment) return;

        const currentlyLiked = comment.user_liked;
        let addEndpoint = isReply ? 'add-reply-reaction' : 'add-comment-reaction';
        let removeEndpoint = isReply ? 'remove-reply-reaction' : 'remove-comment-reaction';

        comment.user_liked = !currentlyLiked;
        comment.likes_count += currentlyLiked ? -1 : 1;
        render(); // Use full render for simplicity, could optimize to renderComment

        try {
            const payload = { tidal_user_id: state.userId, comment_id: commentId, emoji: LIKE_EMOJI };
            const endpoint = currentlyLiked ? removeEndpoint : addEndpoint;
            await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${SUPABASE_URL}/functions/v1/${endpoint}`,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                    data: JSON.stringify(payload),
                    onload: res => ((res.status >= 200 && res.status < 300) || res.status === 409 || res.status === 404) ? resolve(res) : reject(res),
                    onerror: reject
                });
            });
        } catch (error) {
            console.error(`Error toggling like on ${isReply ? 'reply' : 'comment'}:`, error);
            comment.user_liked = currentlyLiked;
            comment.likes_count += currentlyLiked ? 1 : -1;
            render();
            alert('Could not update reaction. Please try again.');
        }
    }

    // --- UI RENDERING (MERGED) ---
    function createSidebar() {
        if (document.getElementById('social-comments-sidebar')) return document.getElementById('social-comments-sidebar');
        const el = document.createElement('aside');
        el.id = 'social-comments-sidebar';
        el.className = '_container_b3e8f28';
        el.innerHTML = `
            <div class="social-comments-header _header_f4bacf5">
                <span class="social-comments-title _title_776ac91">Comments</span>
                <div class="social-header-controls">
                    <select id="social-sort-mode" class="social-sort-select">
                        <option value="most_engagement">Most Engaging</option>
                        <option value="latest">Latest</option>
                        <option value="earliest">Earliest</option>
                        <option value="most_reactions">Most Reactions</option>
                        <option value="most_replies">Most Replies</option>
                        <option value="timestamp">Live Timestamp</option>
                    </select>
                    <button class="social-action-button" title="Close" data-action="close">
                        <svg class="_icon_77f3f89" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
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
        el.addEventListener('click', handleSidebarClick);
        const input = el.querySelector('.social-input-field');
        input.addEventListener('input', () => {
            el.querySelector('.social-send-btn').disabled = !input.value.trim();
            input.style.height = 'auto';
            input.style.height = `${input.scrollHeight}px`;
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
        });
        return el;
    }

    function createCommentElement(comment, isReply = false) {
        const item = document.createElement('div');
        item.className = 'social-comment-item';
        item.dataset.id = comment.id;

        const hasReplies = !isReply && comment.replies && comment.replies.length > 0;
        const repliesContainerClass = hasReplies ? 'social-replies-container collapsed' : 'social-replies-container';
        let repliesToggleHTML = '';
        if (hasReplies) {
            const replyText = comment.replies.length === 1 ? 'reply' : 'replies';
            repliesToggleHTML = `<button class="replies-toggle-button" data-action="toggle-replies">&#9473;&#9473; View ${comment.replies.length} ${replyText}</button>`;
        }

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
                    ${!isReply ? `<button class="social-action-button reply-btn" data-action="reply" data-id="${comment.id}" data-name="${comment.user_name}">Reply</button>` : ''}
                    ${comment.user_id === state.userId ? `<button class="social-action-button delete-btn" data-action="delete" data-id="${comment.id}" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>` : ''}
                </div>
                ${repliesToggleHTML}
                <div class="${repliesContainerClass}"></div>
            </div>`;
        return item;
    }

    function render() {
        if (!commentsSidebar) return;
        commentsSidebar.classList.toggle('_containerIsOpen_5f53707', state.isOpen);
        commentsButton?.classList.toggle('active', state.isOpen);
        if (!state.isOpen) return;

        if (state.loading) {
            commentsList.innerHTML = '<div class="social-state-placeholder"><div class="social-state-icon">⏳</div>Loading...</div>';
            return;
        }
        if (state.comments.length === 0) {
            let message = 'Be the first to comment!';
            let icon = '💬';
            if (!state.trackId) {
                message = 'Play a track to see comments.';
                icon = '🎵';
            } else if (state.sortMode === 'timestamp') {
                message = 'Comments will appear here live as the song plays.';
                icon = '🕒';
            }
            commentsList.innerHTML = `<div class="social-state-placeholder"><div class="social-state-icon">${icon}</div>${message}</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        state.comments.forEach(comment => {
            const commentEl = createCommentElement(comment, false);
            if (comment.replies && comment.replies.length > 0) {
                const repliesContainer = commentEl.querySelector('.social-replies-container');
                comment.replies.forEach(reply => {
                    repliesContainer.appendChild(createCommentElement(reply, true));
                });
            }
            fragment.appendChild(commentEl);
        });
        commentsList.innerHTML = '';
        commentsList.appendChild(fragment);
    }

    // --- EVENT HANDLERS (MERGED) ---
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
            case 'close':
                state.isOpen = false; render(); break;
            case 'send':
                const content = commentInput.value.trim();
                if (content) postComment(content, state.replyingTo?.id);
                break;
            case 'like':
                toggleLike(id); break;
            case 'seek':
                const media = document.querySelector('video, audio');
                if(media) media.currentTime = parseFloat(time);
                break;
            case 'reply':
                state.replyingTo = { id, name };
                replyingIndicator.innerHTML = `Replying to <strong>${name}</strong> <button id="cancel-reply-btn" data-action="cancel-reply" title="Cancel reply">×</button>`;
                replyingIndicator.style.display = 'block';
                commentInput.placeholder = 'Write your reply...';
                commentInput.focus();
                break;
            case 'cancel-reply':
                cancelReply(); break;
            case 'delete':
                deleteComment(id); break;
            case 'toggle-replies':
                const commentItem = target.closest('.social-comment-item');
                if (commentItem) {
                    const repliesContainer = commentItem.querySelector('.social-replies-container');
                    const isCollapsed = repliesContainer.classList.toggle('collapsed');
                    const commentId = commentItem.dataset.id;
                    const commentPool = state.sortMode === 'timestamp' ? state.allTimestampComments : state.comments;
                    const parentComment = commentPool.find(c => c.id == commentId);
                    if (parentComment) {
                        const replyCount = parentComment.replies.length;
                        const replyText = replyCount === 1 ? 'reply' : 'replies';
                        target.innerHTML = isCollapsed ? `&#9473;&#9473; View ${replyCount} ${replyText}` : `&#9473;&#9473; Hide replies`;
                    }
                }
                break;
        }
    }

    function toggleCommentsPanel() {
        state.isOpen = !state.isOpen;
        if (state.isOpen) {
            const playQueueSidebar = document.getElementById('playQueueSidebar');
            if (playQueueSidebar?.classList.contains('_containerIsOpen_5f53707')) {
                document.querySelector('[data-test="play-queue-button"]')?.click();
            }
        }
        if (state.isOpen && (state.comments.length === 0 || state.allTimestampComments.length === 0)) {
            fetchComments();
        }
        render();
    }

    // --- INITIALIZATION ---
    function init() {
        const playerControls = document.querySelector('._moreContainer_f6162c8, [data-test="player-controls-right"]');
        if (document.querySelector('.social-comments-button') || !playerControls) return;

        commentsButton = document.createElement('button');
        commentsButton.className = 'social-comments-button';
        commentsButton.title = 'Show Comments';
        commentsButton.innerHTML = `<svg class="_icon_77f3f89" viewBox="0 0 24 24"><path fill="currentColor" d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;
        commentsButton.onclick = toggleCommentsPanel;

        const playQueueButton = playerControls.querySelector('[data-test="play-queue-button"]');
        if (playQueueButton) {
            playerControls.insertBefore(commentsButton, playQueueButton);
        } else {
            playerControls.appendChild(commentsButton);
        }

        commentsSidebar = createSidebar();
        commentsList = commentsSidebar.querySelector('.social-comments-list-container');
        commentInput = commentsSidebar.querySelector('.social-input-field');
        sendButton = commentsSidebar.querySelector('.social-send-btn');
        replyingIndicator = commentsSidebar.querySelector('#replying-to-indicator');

        const sortDropdown = document.getElementById('social-sort-mode');
        if (sortDropdown) {
            sortDropdown.value = state.sortMode;
            sortDropdown.addEventListener('change', (e) => {
                state.sortMode = e.target.value;
                state.loading = true;
                render();
                fetchComments();
            });
        }

        playQueueButton?.addEventListener('click', () => {
            if (state.isOpen) { state.isOpen = false; render(); }
        });

        console.log('TIDAL Social Comments initialized!');
    }

    // --- TRACKING & POLLING (UPDATED DOM-BASED) ---
    let lastTrackId = null;
    setInterval(() => {
        if (!document.querySelector('.social-comments-button')) init();
        const newCurrentTime = document.querySelector('audio, video')?.currentTime || 0;

        // MODIFICATION: Client-side filtering for Live Timestamp mode
        if (state.isOpen && state.trackId && state.sortMode === 'timestamp' && newCurrentTime !== state.currentTime) {
            state.currentTime = newCurrentTime;
            const visibleComments = state.allTimestampComments.filter(
                comment => comment.playback_time <= newCurrentTime
            );

            // Only re-render if the number of visible comments has changed
            if (visibleComments.length !== state.comments.length) {
                state.comments = visibleComments;
                render();
            }
        } else {
             state.currentTime = newCurrentTime;
        }

        // DOM-based track ID detection
        const footerLink = document.querySelector('#footerPlayer a[href*="/track/"]');
        const newTrackId = footerLink?.getAttribute('href')?.match(/\/track\/(\d+)/)?.[1] || null;

        if (newTrackId !== lastTrackId) {
            lastTrackId = newTrackId;
            state.trackId = newTrackId;
            state.loading = true;
            state.comments = [];
            // MODIFICATION: Clear the timestamp cache on track change
            state.allTimestampComments = [];
            state.lastFetchedSecond = -1;
            if (state.replyingTo) cancelReply();
            if (state.isOpen) {
                fetchComments();
            } else {
                render();
            }
        }
    }, 250);

    // Regular polling for non-timestamp modes
    setInterval(() => {
        if (!state.isOpen || !state.trackId || state.loading || state.sortMode === 'timestamp') return;

        GM_xmlhttpRequest({
            method: 'POST',
            url: `${SUPABASE_URL}/functions/v1/check-update-ts`,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            data: JSON.stringify({ track_id: state.trackId }),
            onload: function (res) {
                if (res.status === 200) {
                    try {
                        const { latest_comment_id, latest_reply_id } = JSON.parse(res.responseText);
                        const commentChanged = latest_comment_id && latest_comment_id !== lastKnownCommentId;
                        const replyChanged = latest_reply_id && latest_reply_id !== lastKnownReplyId;
                        if (commentChanged || replyChanged) {
                            lastKnownCommentId = latest_comment_id;
                            lastKnownReplyId = latest_reply_id;
                            fetchComments();
                        }
                    } catch (err) { console.error('Error parsing update check response:', err); }
                } else { console.error('Failed to check for updates:', res); }
            },
            onerror: function (err) { console.error('Network error while polling for updates:', err); }
        });
    }, 5000);

    const observer = new MutationObserver(() => {
        if (document.querySelector('._moreContainer_f6162c8, [data-test="player-controls-right"]')) {
            init();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
