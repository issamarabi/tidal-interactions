// Stuff this guy does differently than the last script: 
// 1. Implemented postComment using add-comment from the Edge Functions (backend)
// 2. Implemented fetchComments using get-thread from the Edge Functions (backend)
// 3. Implemented toggleLike using add-comment-reaction and remove-comment-reaction from the Edge Functions (backend)
// there's some specifics there with hardlocking the comment reactions to the like emoji, but that's fine and can keep existing schema for 
// more reactions when do song-reaction UI implementation
// Note: ATM UI needs to be updated to implement replies (nested to comments); relevant information being returned, but not used
// Note: ATM UI needs to be updated to have some sort of sorting menu selection; then, just need to pass the corresponding argument to the backend call and it'll work (using default argument currently, which sorts by # of reactions, replies)


// ==UserScript==
// @name         TIDAL Social Comments (Native UI)
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  A social comments overlay for TIDAL, perfectly mimicking the native Play Queue UI and positioning.
// @author       Social Overlay Team (Positioning Fixed by AI)
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
    const AVATAR_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptMC0xNGMtMi4yMSAwLTQgMS43OS00IDRzMS43OSA0IDQgNCA0LTEuNzkgNC00LTEuNzktNC00LTR6bTAtOEM5LjA0IDE0IDYgMTUuNzkgNiAxN2g4YzAgLTEuMjEtMy4wNC0zLTQtM3oiLz48L3N2Zz4=';

    // --- NATIVE STYLES ---
    GM_addStyle(`
        /* Main sidebar container - EXACTLY mimics #playQueueSidebar positioning */
        #social-comments-sidebar {
            position: fixed;
            top: 64px;        /* <-- FIXED: Aligns below the main header */
            right: 0;
            bottom: 90px;     /* Aligns with player */
            width: 388px;     /* Matches native width */
            z-index: 9990;    /* Matches native z-index */
            background-color: var(--wave-color-background-base-secondary, #1a1a1a);
            border-left: 1px solid var(--wave-color-border-primary, rgba(255, 255, 255, 0.1));
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
        }

        #social-comments-sidebar._containerIsOpen_5f53707 { /* Use TIDAL's own class for 'open' */
            transform: translateX(0);
        }

        /* Header - Mimics Play Queue Header */
        .social-comments-header {
            padding: 24px 24px 16px;
            flex-shrink: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        /* Title - Mimics _title_776ac91 */
        .social-comments-title {
            color: var(--wave-color-text-primary);
            font-size: 1.25rem;
            line-height: 1.4;
            font-weight: 700;
        }

        /* Comments List Area - Mimics _playQueueItems_84488b2 */
        .social-comments-list-container {
            flex-grow: 1;
            overflow-y: auto;
            padding: 0 8px;
        }

        /* Individual Comment - Mimics _container_aab70e3 */
        .social-comment-item {
            display: flex; align-items: center; padding: 8px;
            border-radius: 6px; gap: 16px; animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .social-comment-item:hover { background-color: var(--wave-color-interactive-primary-hover); }

        /* Comment Avatar - Mimics _cellContainer_182d240 */
        .social-comment-avatar-container { flex-shrink: 0; width: 48px; height: 48px; }
        .social-comment-avatar-container img { width: 100%; height: 100%; border-radius: 4px; object-fit: cover; }

        /* Comment Body - Mimics _titleArtistGroup_41b8765 */
        .social-comment-body { flex-grow: 1; min-width: 0; }
        .social-comment-author-line { display: flex; align-items: baseline; gap: 8px; color: var(--wave-color-text-primary); }
        .social-comment-text {
            color: var(--wave-color-text-secondary); font-size: 0.875rem; /* 14px */
            line-height: 1.5; margin-top: 4px; word-break: break-word;
        }
        .comment-playback-time { color: var(--wave-color-text-tertiary); cursor: pointer; }
        .comment-playback-time:hover { color: var(--wave-color-text-primary); text-decoration: underline; }

        /* Comment Actions - Mimics _actions_3b2b8f9 */
        .social-comment-actions { display: flex; align-items: center; gap: 4px; }
        .social-action-button {
            background: none; border: none; cursor: pointer; color: var(--wave-color-text-tertiary); padding: 8px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .social-action-button:hover {
            background-color: var(--wave-color-interactive-primary-hover-solid);
            color: var(--wave-color-text-primary);
        }
        .social-action-button.liked { color: var(--wave-color-solid-primary-base); }

        /* Input Area at the bottom */
        .social-input-area {
            padding: 16px; border-top: 1px solid var(--wave-color-border-primary);
            background-color: var(--wave-color-background-base-secondary); flex-shrink: 0;
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

        /* Player Button - identical behavior to Play Queue button */
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

        /* Loading/Empty states */
        .social-state-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--wave-color-text-tertiary); text-align: center; gap: 8px; }
        .social-state-icon { font-size: 32px; opacity: 0.5; }
    `);

    // --- STATE MANAGEMENT ---
    let state = {
        isOpen: false, comments: [], loading: true, trackId: null, currentTime: 0,
        replyingTo: null,
        userId: GM_getValue('social-overlay-user-id') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    GM_setValue('social-overlay-user-id', state.userId);

    // --- DOM ELEMENTS ---
    let commentsSidebar, commentsList, commentInput, sendButton, commentsButton;

    // --- HELPERS ---
    const formatTime = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
    function formatRelativeTime(dateString) {
        const diff = (new Date() - new Date(dateString)) / 1000;
        if (diff < 60) return `now`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    }

      // NEW HELPER FUNCTION TO MAKE USER IDs READABLE
    //function formatUserId(id) {
      // if (!id || !id.includes('-')) return 'User';
        //const parts = id.split('-');
        //return `User-${parts[parts.length - 1].substring(0, 5)}`;
    //}

    // Better helper function that should ideally not treat user names badly
    function formatUserId(id) {
      // 1. Handle the case of a truly empty ID.
      if (!id) {
          return 'User';
      }

      // 2. If it's a long, generated ID, shorten it.
      if (id.includes('-')) {
          const parts = id.split('-');
          return `User-${parts[parts.length - 1].substring(0, 5)}`;
      }

      // 3. If it's a simple ID like "bob", just capitalize and use it.
      // This makes it much more flexible.
      return id.charAt(0).toUpperCase() + id.slice(1);
  }

    // --- SUPABASE API ---
    const supabaseRequest = (method, endpoint, data = null) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method, url: `${SUPABASE_URL}/rest/v1/${endpoint}`,
                headers: {
                    'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': method === 'POST' || method === 'PATCH' ? 'return=representation' : undefined,
                },
                data: data ? JSON.stringify(data) : undefined,
                onload: res => res.status >= 200 && res.status < 300 ? resolve(JSON.parse(res.responseText)) : reject(res),
                onerror: reject
            });
        });
    };

    // --- CORE LOGIC ---
    async function fetchComments(mode = 'full') {
        if (!state.trackId) {
            state.comments = [];
            state.loading = false;
            render();
            return;
        }

        const payload = { track_id: state.trackId };

        GM_xmlhttpRequest({
            method: 'POST',
            url: `${SUPABASE_URL}/functions/v1/get-thread`,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            data: JSON.stringify(payload),
            onload: function(response) {
                let newComments = [];
                if (response.status === 200) {
                    const responseData = JSON.parse(response.responseText);
                    const backendComments = responseData.comments || [];

                    newComments = backendComments.map(comment => {
                        const likes_count = comment.reactions.length;
                        const user_liked = comment.reactions.some(reaction => reaction.tidal_user_id === state.userId);

                        // FIXED: Use actual user data instead of placeholders.
                        return {
                            id: comment.id,
                            user_id: comment.tidal_user_id,
                            user_name: formatUserId(comment.tidal_user_id), // Use the formatted ID as the name
                            avatar_url: comment.avatar_url, // Preserve the fetched avatar URL
                            content: comment.body,
                            playback_time: comment.timestamp_seconds,
                            created_at: comment.created_at,
                            likes_count: likes_count,
                            user_liked: user_liked,
                        };
                    });
                } else if (response.status !== 404) {
                    console.error('Error fetching comments:', response);
                }

                if (mode === 'poll' && newComments.length > 0) {
                    state.comments = newComments;
                } else if (mode === 'full') {
                    state.comments = newComments;
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
    }

    async function postComment(content, parentId = null) {
        // --- 1. Initial validation: ensure we have necessary data ---
        if (!state.trackId || !content) {
            console.error("postComment called without trackId or content.");
            return;
        }

        // --- 2. Construct the payload to match the Edge Function's requirements ---
        const payload = {
            tidal_user_id: state.userId,
            track_id: state.trackId,
            body: content, // The Edge Function expects the key 'body'
            timestamp_seconds: Math.floor(state.currentTime)
        };

        // Note: The provided 'add-comment' Edge Function does not handle replies ('parentId').
        // This implementation will only post top-level comments.
        if (parentId) {
            console.warn("Replying is not supported by the 'add-comment' function yet. Posting as a top-level comment.");
        }

        // --- 3. Call the Edge Function using GM_xmlhttpRequest ---
        // UI state like spinners and disabled buttons are no longer handled here.
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${SUPABASE_URL}/functions/v1/add-comment`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                // --- 4. Handle the response from the server ---
                if (response.status === 201) { // 201 Created: Success!
                    const newCommentFromServer = JSON.parse(response.responseText);

                    // Map the response to the format your UI expects.
                    const commentForUI = {
                        id: newCommentFromServer.id,
                        user_id: newCommentFromServer.tidal_user_id,
                        user_name: 'TIDAL User',
                        content: newCommentFromServer.body,
                        playback_time: newCommentFromServer.timestamp_seconds,
                        created_at: newCommentFromServer.created_at,
                    };

                    // Add the new comment to the state and re-render the UI.
                    // It does not touch the input field's value or state directly.
                    state.comments.unshift(commentForUI);
                    render();

                } else {
                    // Handle errors (e.g., 400 Bad Request, 502 Server Error)
                    const errorResponse = JSON.parse(response.responseText || '{}');
                    console.error('Failed to post comment:', response.status, errorResponse.error);
                    alert(`Error: Could not post comment. ${errorResponse.error || 'Please try again.'}`);
                }
            },
            onerror: function(error) {
                // Handle network-level errors
                console.error('Network error while posting comment:', error);
                alert('A network error occurred. Please check your connection and try again.');
            },
            ontimeout: function() {
                console.error('Request to post comment timed out.');
                alert('The request timed out. Please try again.');
            },
            onabort: function() {
                console.log('Request to post comment was aborted.');
            }
            // The 'finally' block has been removed as it was only used for UI state management.
        });
    }

   async function toggleLike(commentId) {
        const comment = state.comments.find(c => c.id == commentId);
        if (!comment) return;

        // The emoji we will use to represent a "like". This can be changed.
        const LIKE_EMOJI = '👍';

        const currentlyLiked = comment.user_liked;

        // --- 1. Optimistic UI Update ---
        // Immediately update the UI for a responsive feel, assuming success.
        comment.user_liked = !currentlyLiked;
        comment.likes_count += currentlyLiked ? -1 : 1;
        renderComment(comment); // Re-render just this one comment for efficiency

        try {
            const payload = {
                tidal_user_id: state.userId,
                comment_id: commentId,
                emoji: LIKE_EMOJI
            };

            // --- 2. Call the Correct Backend Function ---
            if (currentlyLiked) {
                // If it was liked, we need to REMOVE the reaction.
                await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST', // Your backend uses POST for removal
                        url: `${SUPABASE_URL}/functions/v1/remove-comment-reaction`,
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                        data: JSON.stringify(payload),
                        // Success is 200 OK. A 404 means it was already gone, which is also a success state.
                        onload: res => (res.status === 200 || res.status === 404 ? resolve(res) : reject(res)),
                        onerror: reject
                    });
                });
            } else {
                // If it was not liked, we need to ADD the reaction.
                await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: `${SUPABASE_URL}/functions/v1/add-comment-reaction`,
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                        data: JSON.stringify(payload),
                        // Success is 201 Created. A 409 means it already exists, which is also a success state.
                        onload: res => (res.status === 201 || res.status === 409 ? resolve(res) : reject(res)),
                        onerror: reject
                    });
                });
            }
        } catch (error) {
            // --- 3. Revert UI on Failure ---
            // If the network request fails, undo the optimistic update to show the true state.
            console.error('Error toggling like:', error);
            comment.user_liked = currentlyLiked; // Revert to the original liked state
            comment.likes_count += currentlyLiked ? 1 : -1; // Revert the count
            renderComment(comment); // Re-render the comment to show the reverted state
            alert('Could not update reaction. Please try again.');
        }
    }

    // --- UI RENDERING ---
    function createSidebar() {
        if (document.getElementById('social-comments-sidebar')) return document.getElementById('social-comments-sidebar');
        const el = document.createElement('aside');
        el.id = 'social-comments-sidebar';
        el.className = '_container_b3e8f28';
        el.innerHTML = `
            <div class="social-comments-header _header_f4bacf5">
                <span class="social-comments-title _title_776ac91">Comments</span>
                <button class="social-action-button" title="Close" data-action="close">
                     <svg class="_icon_77f3f89" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
            <div class="social-comments-list-container _playQueueItems_84488b2"></div>
            <div class="social-input-area">
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
        input.addEventListener('input', () => { el.querySelector('.social-send-btn').disabled = !input.value.trim(); input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendButton.click(); }});
        return el;
    }

    function createCommentElement(comment) {
          const item = document.createElement('div');
          item.className = 'social-comment-item _container_aab70e3';
          item.dataset.id = comment.id;
          item.innerHTML = `
              <div class="social-comment-avatar-container _cellContainer_182d240">
                  <!-- FIXED: Use the comment's specific avatar_url, with a fallback to the generic one -->
                  <img src="${comment.avatar_url || AVATAR_URL}" class="_cellImage_0ef8dd3" />
              </div>
              <div class="social-comment-body _titleArtistGroup_41b8765">
                  <div class="social-comment-author-line wave-text-description-demi">
                      <!-- This will now display the formatted user ID -->
                      <span>${comment.user_name}</span>
                      <span class="wave-text-capital-demi" style="color: var(--wave-color-text-tertiary);">${formatRelativeTime(comment.created_at)}</span>
                  </div>
                  <div class="social-comment-text">
                      ${comment.content.replace(/\n/g, '<br>')}
                      ${comment.playback_time > 0 ? `<span class="comment-playback-time" data-action="seek" data-time="${comment.playback_time}" title="Jump to time"> @${formatTime(comment.playback_time)}</span>` : ''}
                  </div>
              </div>
              <div class="social-comment-actions _actions_3b2b8f9">
                  <button class="social-action-button ${comment.user_liked ? 'liked' : ''}" data-action="like" data-id="${comment.id}" title="Like">
                       <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>
                  </button>
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
            const message = state.trackId ? 'Be the first to comment!' : 'Play a track to see comments.';
            const icon = state.trackId ? '💬' : '🎵';
            commentsList.innerHTML = `<div class="social-state-placeholder"><div class="social-state-icon">${icon}</div>${message}</div>`;
            return;
        }

        commentsList.innerHTML = '';
        state.comments.filter(c => !c.parent_id).forEach(comment => {
            commentsList.appendChild(createCommentElement(comment));
        });
    }

    function renderComment(comment) {
        const el = commentsList.querySelector(`.social-comment-item[data-id="${comment.id}"]`);
        if (el) el.replaceWith(createCommentElement(comment));
    }

    // --- EVENT HANDLERS ---
    function handleSidebarClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const { action, id, time } = target.dataset;
        switch (action) {
            case 'close': state.isOpen = false; render(); break;
            case 'send':
                const content = commentInput.value.trim();
                if (content) {
                    postComment(content, state.replyingTo);
                    commentInput.value = ''; commentInput.style.height = 'auto'; sendButton.disabled = true;
                }
                break;
            case 'like': toggleLike(id); break;
            case 'seek': document.querySelector('audio, video')?.fastSeek(parseFloat(time)); break;
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
        if (state.isOpen && state.loading) fetchComments('full');
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

        playQueueButton?.addEventListener('click', () => {
            if (state.isOpen) { state.isOpen = false; render(); }
        });

        console.log('TIDAL Social Comments initialized!');
    }

    // --- TRACKING & POLLING ---
    let lastTrackId = null;
    setInterval(() => {
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
            else render();
        }
    }, 1000);

    setInterval(() => {
        if (state.isOpen && state.trackId && !state.loading) {
            fetchComments('poll');
        }
    }, 5000);

    const observer = new MutationObserver(() => {
        if (document.querySelector('._moreContainer_f6162c8, [data-test="player-controls-right"]')) {
            init();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();