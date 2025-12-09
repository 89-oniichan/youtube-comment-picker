/**
 * Premium YouTube Giveaway Extension - Full Featured
 * With confetti, advanced filters, multiple exports, and more!
 */

// State Management
let allComments = [];
let filteredComments = [];
let selectedWinners = [];
let startTime = Date.now();

// DOM Elements
const elements = {
  // Buttons
  extractBtn: document.getElementById('extractBtn'),
  scrollBtn: document.getElementById('scrollBtn'),
  stopScrollBtn: document.getElementById('stopScrollBtn'),
  headerRefreshBtn: document.getElementById('headerRefreshBtn'),
  clearSessionBtn: document.getElementById('clearSessionBtn'),
  pickBtn: document.getElementById('pickBtn'),
  pickAgainBtn: document.getElementById('pickAgainBtn'),
  copyWinnersBtn: document.getElementById('copyWinnersBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportTxtBtn: document.getElementById('exportTxtBtn'),
  exportAllJsonBtn: document.getElementById('exportAllJsonBtn'),
  exportAllCsvBtn: document.getElementById('exportAllCsvBtn'),
  exportAllTxtBtn: document.getElementById('exportAllTxtBtn'),
  viewAllBtn: document.getElementById('viewAllBtn'),
  closeModal: document.getElementById('closeModal'),
  decreaseBtn: document.getElementById('decreaseBtn'),
  increaseBtn: document.getElementById('increaseBtn'),
  clearFilter: document.getElementById('clearFilter'),

  // Inputs
  filterInput: document.getElementById('filterInput'),
  excludeInput: document.getElementById('excludeInput'),
  minLengthInput: document.getElementById('minLengthInput'),
  removeDuplicates: document.getElementById('removeDuplicates'),
  winnerCount: document.getElementById('winnerCount'),
  modalSearch: document.getElementById('modalSearch'),

  // Display
  statusBar: document.getElementById('statusBar'),
  statusText: document.getElementById('statusText'),
  totalComments: document.getElementById('totalComments'),
  uniqueUsers: document.getElementById('uniqueUsers'),
  filteredCount: document.getElementById('filteredCount'),
  winnersList: document.getElementById('winnersList'),
  previewList: document.getElementById('previewList'),
  modalCommentsList: document.getElementById('modalCommentsList'),
  timeInfo: document.getElementById('timeInfo'),

  // Sections
  statsSection: document.getElementById('statsSection'),
  filterSection: document.getElementById('filterSection'),
  pickerSection: document.getElementById('pickerSection'),
  winnersSection: document.getElementById('winnersSection'),
  previewSection: document.getElementById('previewSection'),
  commentsModal: document.getElementById('commentsModal')
};

// Event Listeners
elements.extractBtn.addEventListener('click', extractComments);
elements.scrollBtn.addEventListener('click', autoScrollPage);
elements.stopScrollBtn.addEventListener('click', stopScrolling);
elements.headerRefreshBtn.addEventListener('click', refreshSession);
elements.clearSessionBtn.addEventListener('click', clearSession);
elements.pickBtn.addEventListener('click', pickWinners);
elements.pickAgainBtn.addEventListener('click', resetPicker);
elements.copyWinnersBtn.addEventListener('click', copyWinners);
elements.exportJsonBtn.addEventListener('click', () => exportWinners('json'));
elements.exportCsvBtn.addEventListener('click', () => exportWinners('csv'));
elements.exportTxtBtn.addEventListener('click', () => exportWinners('txt'));
elements.exportAllJsonBtn.addEventListener('click', () => exportAllComments('json'));
elements.exportAllCsvBtn.addEventListener('click', () => exportAllComments('csv'));
elements.exportAllTxtBtn.addEventListener('click', () => exportAllComments('txt'));
elements.viewAllBtn.addEventListener('click', openCommentsModal);
elements.closeModal.addEventListener('click', closeCommentsModal);
elements.decreaseBtn.addEventListener('click', () => adjustWinnerCount(-1));
elements.increaseBtn.addEventListener('click', () => adjustWinnerCount(1));

// Filter listeners
elements.filterInput.addEventListener('input', handleFilterChange);
elements.excludeInput.addEventListener('input', applyFilters);
elements.minLengthInput.addEventListener('input', applyFilters);
elements.removeDuplicates.addEventListener('change', handleDuplicateToggle);
elements.clearFilter.addEventListener('click', clearFilterInput);
elements.modalSearch.addEventListener('input', searchModalComments);

// Close modal on background click
elements.commentsModal.addEventListener('click', (e) => {
  if (e.target === elements.commentsModal) {
    closeCommentsModal();
  }
});

// Update time every second
setInterval(updateElapsedTime, 1000);

/**
 * Save current session state to Chrome storage
 */
async function saveState() {
  try {
    // Check if chrome.storage is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.warn('Chrome storage API not available');
      return;
    }

    // Get current tab URL to track which page the session is from
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const state = {
      allComments,
      filteredComments,
      selectedWinners,
      startTime,
      filters: {
        keyword: elements.filterInput.value,
        exclude: elements.excludeInput.value,
        minLength: elements.minLengthInput.value,
        removeDuplicates: elements.removeDuplicates.checked
      },
      winnerCount: elements.winnerCount.value,
      timestamp: Date.now(),
      pageUrl: tab ? tab.url : null
    };

    await chrome.storage.local.set({ sessionState: state });
    console.log('Session saved successfully');
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Load saved session state from Chrome storage
 */
async function loadState() {
  try {
    // Check if chrome.storage is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.warn('Chrome storage API not available');
      return;
    }

    const result = await chrome.storage.local.get('sessionState');

    if (result.sessionState) {
      const state = result.sessionState;

      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab ? tab.url : null;

      // Check if we're on the same page - if not, clear the session
      if (state.pageUrl && currentUrl && state.pageUrl !== currentUrl) {
        console.log('Different page detected, clearing session');
        await chrome.storage.local.remove('sessionState');
        return;
      }

      // Restore data
      allComments = state.allComments || [];
      filteredComments = state.filteredComments || [];
      selectedWinners = state.selectedWinners || [];
      startTime = state.startTime || Date.now();

      // Restore filter values
      if (state.filters) {
        elements.filterInput.value = state.filters.keyword || '';
        elements.excludeInput.value = state.filters.exclude || '';
        elements.minLengthInput.value = state.filters.minLength || 0;
        elements.removeDuplicates.checked = state.filters.removeDuplicates !== false;
      }

      elements.winnerCount.value = state.winnerCount || 1;

      // If we have comments, restore the UI
      if (allComments.length > 0) {
        elements.statsSection.style.display = 'block';
        elements.filterSection.style.display = 'block';
        elements.pickerSection.style.display = 'block';
        elements.previewSection.style.display = 'block';

        // Show refresh and clear buttons
        elements.headerRefreshBtn.style.display = 'flex';
        elements.clearSessionBtn.style.display = 'block';

        updateStats();
        showPreview();

        // If we have winners, show them
        if (selectedWinners.length > 0) {
          displayWinners(selectedWinners);
        }

        updateStatus(`Session restored: ${allComments.length} comments loaded`, 'success');

        // Calculate elapsed time from saved session
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        elements.timeInfo.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }

      console.log('Session loaded successfully');
    }
  } catch (error) {
    console.error('Failed to load session:', error);
  }
}

/**
 * Refresh the current session (re-apply filters)
 */
function refreshSession() {
  if (allComments.length === 0) {
    updateStatus('No session to refresh. Please extract comments first.', 'error');
    return;
  }

  applyFilters();
  updateStatus('Session refreshed!', 'success');
}

/**
 * Clear the saved session
 */
async function clearSession() {
  if (confirm('Are you sure you want to clear the current session? This will remove all extracted comments and winners.')) {
    try {
      // Check if chrome.storage is available
      if (chrome && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove('sessionState');
      }

      // Reset state
      allComments = [];
      filteredComments = [];
      selectedWinners = [];
      startTime = Date.now();

      // Reset UI
      elements.filterInput.value = '';
      elements.excludeInput.value = '';
      elements.minLengthInput.value = 0;
      elements.removeDuplicates.checked = true;
      elements.winnerCount.value = 1;

      // Hide sections
      elements.statsSection.style.display = 'none';
      elements.filterSection.style.display = 'none';
      elements.pickerSection.style.display = 'none';
      elements.winnersSection.style.display = 'none';
      elements.previewSection.style.display = 'none';
      elements.headerRefreshBtn.style.display = 'none';
      elements.clearSessionBtn.style.display = 'none';

      updateStatus('Session cleared. Ready to extract new comments.', 'success');
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
      updateStatus('Failed to clear session', 'error');
    }
  }
}

/**
 * Stop the auto-scrolling
 */
async function stopScrolling() {
  try {
    // Set stop flag in chrome storage
    if (chrome && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ stopScroll: true });
    }

    // Update UI
    elements.stopScrollBtn.style.display = 'none';
    elements.scrollBtn.style.display = 'inline-flex';
    elements.scrollBtn.disabled = false;

    updateStatus('Scrolling stopped by user', 'success');
  } catch (error) {
    console.error('Error stopping scroll:', error);
  }
}

/**
 * Auto-scroll the YouTube page to load all comments
 */
async function autoScrollPage() {
  // Clear any previous stop flag
  if (chrome && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ stopScroll: false });
  }

  // Show stop button, hide scroll button
  elements.scrollBtn.style.display = 'none';
  elements.stopScrollBtn.style.display = 'inline-flex';

  updateStatus('Auto-scrolling page... Please wait', 'loading');
  elements.scrollBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        return new Promise((resolve) => {
          // Check if we're on a Shorts page
          const isShorts = window.location.href.includes('/shorts/');

          if (isShorts) {
            // For YouTube Shorts - need special handling
            console.log('Detected Shorts page - using Shorts scroll strategy');

            // Step 1: Try to find and click the comments button to open comments
            const openCommentsPanel = () => {
              // Look for the comments button in various ways
              const selectors = [
                'ytm-comments-entry-point-header-renderer button',
                'button#comments-button',
                'ytd-button-renderer#comments-button button',
                '[aria-label*="Comment"]',
                '[aria-label*="comment"]'
              ];

              for (const selector of selectors) {
                const btn = document.querySelector(selector);
                if (btn && btn.offsetParent !== null) { // Check if visible
                  console.log('Found comments button:', selector);
                  btn.click();
                  return true;
                }
              }

              // Try finding by text content
              const buttons = document.querySelectorAll('button');
              for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('comment') && btn.offsetParent !== null) {
                  console.log('Found comments button by text');
                  btn.click();
                  return true;
                }
              }

              return false;
            };

            // Try to open comments
            openCommentsPanel();

            // Wait a bit for the panel to open
            setTimeout(() => {
              let scrollCount = 0;
              const maxScrolls = 60;
              let noChangeCount = 0;
              let lastCommentCount = 0;

              const scrollInterval = setInterval(async () => {
                // Check if user requested stop
                const shouldStop = await new Promise((resolve) => {
                  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get('stopScroll', (result) => {
                      resolve(result.stopScroll === true);
                    });
                  } else {
                    resolve(false);
                  }
                });

                if (shouldStop) {
                  clearInterval(scrollInterval);
                  window.scrollTo(0, 0);
                  console.log('Shorts scroll stopped by user');
                  resolve({ success: true, scrolls: scrollCount, type: 'shorts', comments: lastCommentCount, stopped: true });
                  return;
                }

                // Try multiple scrolling strategies for Shorts

                // Strategy 1: Scroll the engagement panel if it exists
                const engagementPanel = document.querySelector('ytd-engagement-panel-section-list-renderer');
                if (engagementPanel) {
                  const scrollContainer = engagementPanel.querySelector('#content');
                  if (scrollContainer) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                    console.log('Scrolling engagement panel');
                  }
                }

                // Strategy 2: Scroll the reel player sidebar
                const reelPlayer = document.querySelector('ytd-reel-video-renderer[is-active]');
                if (reelPlayer) {
                  const commentsSection = reelPlayer.querySelector('#comments');
                  if (commentsSection) {
                    commentsSection.scrollIntoView({ block: 'end', behavior: 'smooth' });
                  }
                }

                // Strategy 3: Scroll the shorts container
                const shortsContainer = document.querySelector('ytd-shorts');
                if (shortsContainer) {
                  shortsContainer.scrollTop = shortsContainer.scrollHeight;
                }

                // Strategy 4: Scroll the main page
                window.scrollTo(0, document.documentElement.scrollHeight);

                // Strategy 5: Scroll any visible comment section
                const commentsSections = document.querySelectorAll('#comments, #contents, ytd-item-section-renderer');
                commentsSections.forEach(section => {
                  if (section.scrollHeight > section.clientHeight) {
                    section.scrollTop = section.scrollHeight;
                  }
                });

                scrollCount++;

                setTimeout(() => {
                  // Check how many comments are loaded
                  const currentCommentCount = document.querySelectorAll('ytd-comment-thread-renderer').length;
                  console.log(`Scroll ${scrollCount}: ${currentCommentCount} comments found`);

                  if (currentCommentCount === lastCommentCount) {
                    noChangeCount++;
                  } else {
                    noChangeCount = 0;
                  }

                  lastCommentCount = currentCommentCount;

                  if (noChangeCount >= 6 || scrollCount >= maxScrolls) {
                    clearInterval(scrollInterval);
                    window.scrollTo(0, 0);
                    console.log(`Shorts scroll complete: ${currentCommentCount} comments loaded`);
                    resolve({ success: true, scrolls: scrollCount, type: 'shorts', comments: currentCommentCount });
                  }
                }, 1200);
              }, 1800);
            }, 1000); // Wait 1 second for comments panel to open

          } else {
            // For regular videos and community posts
            console.log('Detected regular page - using standard scroll strategy');

            let scrollCount = 0;
            const maxScrolls = 50;
            let lastHeight = document.documentElement.scrollHeight;
            let noChangeCount = 0;

            const scrollInterval = setInterval(async () => {
              // Check if user requested stop
              const shouldStop = await new Promise((resolve) => {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                  chrome.storage.local.get('stopScroll', (result) => {
                    resolve(result.stopScroll === true);
                  });
                } else {
                  resolve(false);
                }
              });

              if (shouldStop) {
                clearInterval(scrollInterval);
                window.scrollTo(0, 0);
                console.log('Scroll stopped by user');
                resolve({ success: true, scrolls: scrollCount, type: 'regular', stopped: true });
                return;
              }

              window.scrollTo(0, document.documentElement.scrollHeight);
              scrollCount++;

              setTimeout(() => {
                const newHeight = document.documentElement.scrollHeight;

                if (newHeight === lastHeight) {
                  noChangeCount++;
                } else {
                  noChangeCount = 0;
                }

                lastHeight = newHeight;

                if (noChangeCount >= 3 || scrollCount >= maxScrolls) {
                  clearInterval(scrollInterval);
                  window.scrollTo(0, 0);
                  resolve({ success: true, scrolls: scrollCount, type: 'regular' });
                }
              }, 1000);
            }, 1500);
          }
        });
      }
    });

    if (result[0].result.success) {
      const pageType = result[0].result.type === 'shorts' ? 'Shorts' : 'page';
      const commentsInfo = result[0].result.comments ? ` (${result[0].result.comments} comments visible)` : '';
      const wasStoppedInfo = result[0].result.stopped ? ' (Stopped by user)' : '';

      if (!result[0].result.stopped) {
        updateStatus(`Scrolled ${pageType} ${result[0].result.scrolls} times${commentsInfo}. Now extract comments!`, 'success');
      }
    }
  } catch (error) {
    updateStatus('Error scrolling: ' + error.message, 'error');
  } finally {
    // Restore button states
    elements.scrollBtn.disabled = false;
    elements.stopScrollBtn.style.display = 'none';
    elements.scrollBtn.style.display = 'inline-flex';
  }
}

/**
 * Extract comments from the current YouTube page
 */
async function extractComments() {
  updateStatus('Extracting comments... Please wait', 'loading');
  elements.extractBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('youtube.com')) {
      throw new Error('Please navigate to a YouTube page (Video, Short, or Community Post)');
    }

    // Try to send message to content script
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'extractComments' });
    } catch (error) {
      // If connection fails, inject the content script and retry
      if (error.message.includes('Could not establish connection') ||
          error.message.includes('Receiving end does not exist')) {

        updateStatus('Initializing... Please wait', 'loading');

        // Inject content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });

        // Wait a bit for script to initialize
        await new Promise(resolve => setTimeout(resolve, 500));

        // Retry the message
        try {
          response = await chrome.tabs.sendMessage(tab.id, { action: 'extractComments' });
        } catch (retryError) {
          throw new Error('Please refresh the YouTube page and try again');
        }
      } else {
        throw error;
      }
    }

    if (response && response.success) {
      allComments = response.comments;
      startTime = Date.now();

      // Apply initial filters
      applyFilters();

      // Show sections
      elements.statsSection.style.display = 'block';
      elements.filterSection.style.display = 'block';
      elements.pickerSection.style.display = 'block';
      elements.previewSection.style.display = 'block';

      // Show refresh and clear buttons
      elements.headerRefreshBtn.style.display = 'flex';
      elements.clearSessionBtn.style.display = 'block';

      updateStatus(`Successfully extracted ${allComments.length} comments!`, 'success');

      // Save session
      await saveState();

      // Scroll to stats
      elements.statsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      throw new Error(response?.error || 'Failed to extract comments');
    }
  } catch (error) {
    updateStatus('Error: ' + error.message, 'error');
  } finally {
    elements.extractBtn.disabled = false;
  }
}

/**
 * Apply all filters to comments
 */
function applyFilters() {
  let comments = [...allComments];

  // Remove duplicates if enabled
  if (elements.removeDuplicates.checked) {
    const uniqueMap = new Map();
    comments.forEach(comment => {
      const username = comment.username.toLowerCase().trim();
      if (!uniqueMap.has(username)) {
        uniqueMap.set(username, comment);
      }
    });
    comments = Array.from(uniqueMap.values());
  }

  // Apply keyword filter (include)
  const keyword = elements.filterInput.value.trim().toLowerCase();
  if (keyword) {
    comments = comments.filter(comment =>
      comment.comment.toLowerCase().includes(keyword) ||
      comment.username.toLowerCase().includes(keyword)
    );
  }

  // Apply exclude filter
  const excludeKeyword = elements.excludeInput.value.trim().toLowerCase();
  if (excludeKeyword) {
    comments = comments.filter(comment =>
      !comment.comment.toLowerCase().includes(excludeKeyword) &&
      !comment.username.toLowerCase().includes(excludeKeyword)
    );
  }

  // Apply minimum length filter
  const minLength = parseInt(elements.minLengthInput.value) || 0;
  if (minLength > 0) {
    comments = comments.filter(comment => comment.comment.length >= minLength);
  }

  filteredComments = comments;
  updateStats();
  showPreview();

  // Update winner count limits
  elements.winnerCount.max = filteredComments.length;
  if (parseInt(elements.winnerCount.value) > filteredComments.length) {
    elements.winnerCount.value = Math.max(1, filteredComments.length);
  }

  // Save state after filtering
  saveState();
}

/**
 * Handle filter input with debounce
 */
let filterTimeout;
function handleFilterChange() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyFilters();
    elements.clearFilter.style.display = elements.filterInput.value ? 'block' : 'none';
  }, 300);
}

/**
 * Clear filter input
 */
function clearFilterInput() {
  elements.filterInput.value = '';
  elements.clearFilter.style.display = 'none';
  applyFilters();
}

/**
 * Handle duplicate toggle
 */
function handleDuplicateToggle() {
  applyFilters();
}

/**
 * Pick random winners with DRAMATIC SLOT MACHINE animation
 */
async function pickWinners() {
  if (filteredComments.length === 0) {
    updateStatus('No eligible comments to pick from!', 'error');
    return;
  }

  const count = parseInt(elements.winnerCount.value);
  if (count < 1 || count > filteredComments.length) {
    updateStatus(`Please enter between 1 and ${filteredComments.length}`, 'error');
    return;
  }

  elements.pickBtn.disabled = true;
  updateStatus('Picking winners...', 'loading');

  // Pick winners first (behind the scenes)
  const winners = [];
  const pool = [...filteredComments];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    winners.push(pool[randomIndex]);
    pool.splice(randomIndex, 1);
  }

  selectedWinners = winners;

  // Show each winner with slot machine animation
  for (let i = 0; i < winners.length; i++) {
    await showWinnerRevealAnimation(winners[i], i + 1, count);
  }

  // After all reveals, show the final list
  displayWinners(winners);

  // Launch confetti!
  launchConfetti();

  // Save state after picking winners
  await saveState();

  elements.pickBtn.disabled = false;
}

/**
 * Show dramatic slot machine reveal for a single winner
 */
async function showWinnerRevealAnimation(winner, winnerNumber, totalWinners) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'winner-reveal-overlay';

    const card = document.createElement('div');
    card.className = 'winner-reveal-card';

    const title = document.createElement('div');
    title.className = 'winner-reveal-title';
    // Show "SELECTING..." during animation
    title.textContent = totalWinners > 1
      ? `Winner #${winnerNumber} of ${totalWinners} - SELECTING...`
      : 'SELECTING WINNER...';

    const slotMachine = document.createElement('div');
    slotMachine.className = 'slot-machine';

    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'winner-reveal-username';
    usernameDiv.style.display = 'none';

    const commentDiv = document.createElement('div');
    commentDiv.className = 'winner-reveal-comment';
    commentDiv.style.display = 'none';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'winner-reveal-close';
    closeBtn.textContent = 'Continue';
    closeBtn.style.display = 'none';

    card.appendChild(title);
    card.appendChild(slotMachine);
    card.appendChild(usernameDiv);
    card.appendChild(commentDiv);
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Slot machine effect
    let currentIndex = 0;
    let speed = 80; // Moderate speed
    let iterations = 0;
    const maxIterations = 45; // Balanced spin count
    let intervalId;

    const spin = () => {
      intervalId = setTimeout(() => {
        // Show random comment
        const randomComment = filteredComments[currentIndex % filteredComments.length];
        slotMachine.textContent = randomComment.username;

        currentIndex++;
        iterations++;

        // Gradual deceleration starting at 60% through
        if (iterations > maxIterations * 0.6) {
          speed += 12; // Decelerate
        } else if (iterations > maxIterations * 0.3) {
          speed = Math.max(50, speed - 2); // Speed up slightly in middle
        }

        // Stop at winner
        if (iterations >= maxIterations) {
          // Update title to show "SELECTED!"
          title.textContent = totalWinners > 1
            ? `Winner #${winnerNumber} of ${totalWinners} - SELECTED!`
            : 'WINNER SELECTED!';

          // Hide slot machine, show winner with dramatic effect
          setTimeout(() => {
            slotMachine.style.display = 'none';
            usernameDiv.textContent = winner.username;
            usernameDiv.style.display = 'block';

            setTimeout(() => {
              const truncatedComment = winner.comment.length > 150
                ? winner.comment.substring(0, 150) + '...'
                : winner.comment;
              commentDiv.textContent = truncatedComment;
              commentDiv.style.display = 'block';

              setTimeout(() => {
                closeBtn.style.display = 'inline-block';

                closeBtn.onclick = () => {
                  document.body.removeChild(overlay);
                  resolve();
                };

                // Auto-close after 4 seconds if multiple winners
                if (totalWinners > 1) {
                  setTimeout(() => {
                    if (document.body.contains(overlay)) {
                      document.body.removeChild(overlay);
                      resolve();
                    }
                  }, 4000);
                }
              }, 300);
            }, 600);
          }, 300);
        } else {
          spin();
        }
      }, speed);
    };

    spin();
  });
}

/**
 * Display winners with animation
 */
function displayWinners(winners) {
  elements.winnersList.innerHTML = '';

  winners.forEach((winner, index) => {
    setTimeout(() => {
      const card = createWinnerCard(winner, index);
      elements.winnersList.appendChild(card);

      // Play sound effect (optional)
      playWinnerSound();
    }, index * 200);
  });

  // Show winners section
  elements.winnersSection.style.display = 'block';
  elements.pickerSection.style.display = 'none';

  // Scroll to winners
  setTimeout(() => {
    elements.winnersSection.scrollIntoView({ behavior: 'smooth' });
  }, winners.length * 200);

  updateStatus(`Picked ${winners.length} winner(s)!`, 'success');
}

/**
 * Create winner card element
 */
function createWinnerCard(winner, index) {
  const card = document.createElement('div');
  card.className = 'winner-card';

  const truncatedComment = winner.comment.length > 150
    ? winner.comment.substring(0, 150) + '...'
    : winner.comment;

  card.innerHTML = `
    <div class="winner-number">Winner #${index + 1}</div>
    <div class="winner-username">${escapeHtml(winner.username)}</div>
    <div class="winner-comment">${escapeHtml(truncatedComment)}</div>
    <div class="winner-timestamp"><i class="fas fa-clock"></i> ${escapeHtml(winner.timestamp)}</div>
  `;

  return card;
}

/**
 * Reset to pick new winners
 */
function resetPicker() {
  elements.winnersSection.style.display = 'none';
  elements.pickerSection.style.display = 'block';
  updateStatus('Ready to pick new winners', '');
  elements.pickerSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Copy winners to clipboard
 */
async function copyWinners() {
  if (selectedWinners.length === 0) return;

  const text = selectedWinners.map((winner, index) =>
    `Winner #${index + 1}: ${winner.username}\nComment: ${winner.comment}\nPosted: ${winner.timestamp}\n`
  ).join('\n');

  try {
    await navigator.clipboard.writeText(text);
    updateStatus('Winners copied to clipboard!', 'success');
  } catch (error) {
    updateStatus('Failed to copy: ' + error.message, 'error');
  }
}

/**
 * Export winners in different formats
 */
function exportWinners(format) {
  if (selectedWinners.length === 0) return;

  const data = prepareExportData();
  let content, filename, mimeType;

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      filename = `giveaway-winners-${Date.now()}.json`;
      mimeType = 'application/json';
      break;

    case 'csv':
      content = convertToCSV(selectedWinners);
      filename = `giveaway-winners-${Date.now()}.csv`;
      mimeType = 'text/csv';
      break;

    case 'txt':
      content = convertToTXT(data);
      filename = `giveaway-winners-${Date.now()}.txt`;
      mimeType = 'text/plain';
      break;
  }

  downloadFile(content, filename, mimeType);
  updateStatus(`Exported to ${format.toUpperCase()}!`, 'success');
}

/**
 * Export all comments (filtered) in different formats
 */
function exportAllComments(format) {
  if (filteredComments.length === 0) {
    updateStatus('No comments to export!', 'error');
    return;
  }

  let content, filename, mimeType;

  switch (format) {
    case 'json':
      content = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalComments: allComments.length,
        filteredCount: filteredComments.length,
        filters: {
          keyword: elements.filterInput.value.trim(),
          exclude: elements.excludeInput.value.trim(),
          minLength: parseInt(elements.minLengthInput.value) || 0,
          removeDuplicates: elements.removeDuplicates.checked
        },
        comments: filteredComments
      }, null, 2);
      filename = `youtube-comments-${Date.now()}.json`;
      mimeType = 'application/json';
      break;

    case 'csv':
      content = convertCommentsToCSV(filteredComments);
      filename = `youtube-comments-${Date.now()}.csv`;
      mimeType = 'text/csv';
      break;

    case 'txt':
      content = convertCommentsToTXT(filteredComments);
      filename = `youtube-comments-${Date.now()}.txt`;
      mimeType = 'text/plain';
      break;
  }

  downloadFile(content, filename, mimeType);
  updateStatus(`Exported ${filteredComments.length} comments to ${format.toUpperCase()}!`, 'success');
}

/**
 * Prepare export data
 */
function prepareExportData() {
  return {
    exportDate: new Date().toISOString(),
    totalComments: allComments.length,
    uniqueUsers: new Set(allComments.map(c => c.username.toLowerCase())).size,
    filters: {
      keyword: elements.filterInput.value.trim(),
      exclude: elements.excludeInput.value.trim(),
      minLength: parseInt(elements.minLengthInput.value) || 0,
      removeDuplicates: elements.removeDuplicates.checked
    },
    filteredCount: filteredComments.length,
    winnersCount: selectedWinners.length,
    winners: selectedWinners,
    allComments: allComments
  };
}

/**
 * Convert winners to CSV format
 */
function convertToCSV(winners) {
  // Metadata rows (will show at top of CSV)
  const metadata = [
    ['YouTube Giveaway Winners Export'],
    ['Generated by YouTube Comment Picker'],
    ['Export Date:', new Date().toLocaleString()],
    ['Total Winners:', winners.length],
    ['Total Entries:', allComments.length],
    [''], // Empty row
  ];

  const headers = ['Winner #', 'Username', 'Comment', 'Timestamp'];
  const rows = winners.map((winner, index) => [
    index + 1,
    winner.username || 'N/A',
    // Replace newlines with space for single-line display in Excel
    winner.comment ? winner.comment.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '') : '',
    winner.timestamp || 'N/A'
  ]);

  return [
    ...metadata.map(row => row.map(cell => `"${cell}"`).join(',')),
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

/**
 * Convert all comments to CSV format
 */
function convertCommentsToCSV(comments) {
  // Metadata rows (will show at top of CSV)
  const metadata = [
    ['YouTube Comments Export'],
    ['Generated by YouTube Comment Picker'],
    ['Export Date:', new Date().toLocaleString()],
    ['Total Comments:', comments.length],
    ['Original Total:', allComments.length],
    ['Filters Applied:', elements.filterInput.value || 'None'],
    [''], // Empty row
  ];

  const headers = ['#', 'Username', 'Comment', 'Timestamp'];
  const rows = comments.map((comment, index) => [
    index + 1,
    comment.username || 'N/A',
    // Replace newlines with space for single-line display in Excel
    comment.comment ? comment.comment.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '') : '',
    comment.timestamp || 'N/A'
  ]);

  return [
    ...metadata.map(row => row.map(cell => `"${cell}"`).join(',')),
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

/**
 * Convert all comments to TXT format
 */
function convertCommentsToTXT(comments) {
  let text = `
╔════════════════════════════════════════════════════╗
║         YOUTUBE COMMENTS EXPORT                    ║
║       YouTube Comment Picker by oniisama           ║
╚════════════════════════════════════════════════════╝

Export Date: ${new Date().toLocaleString()}
Total Comments: ${comments.length}

COMMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  comments.forEach((comment, index) => {
    text += `
#${index + 1}
───────────────────────────────────────────────────
Username:    ${comment.username}

Comment:
${comment.comment}

`;
  });

  text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YouTube Comment Picker - Works on Videos, Shorts & Community Posts
Developed by oniisama
`;

  return text;
}

/**
 * Convert data to formatted TXT
 */
function convertToTXT(data) {
  let text = `
╔════════════════════════════════════════════════════╗
║         YOUTUBE GIVEAWAY WINNERS                   ║
║       YouTube Comment Picker by oniisama           ║
╚════════════════════════════════════════════════════╝

Export Date: ${new Date(data.exportDate).toLocaleString()}

STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Comments:          ${data.totalComments}
Unique Users:            ${data.uniqueUsers}
After Filters:           ${data.filteredCount}
Winners Selected:        ${data.winnersCount}

FILTERS APPLIED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Keyword Filter:          ${data.filters.keyword || '(none)'}
Exclude Keywords:        ${data.filters.exclude || '(none)'}
Min Comment Length:      ${data.filters.minLength || 'No limit'}
Remove Duplicates:       ${data.filters.removeDuplicates ? 'Yes' : 'No'}

WINNERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  data.winners.forEach((winner, index) => {
    text += `
WINNER #${index + 1}
───────────────────────────────────────────────────
Username:    ${winner.username}

Comment:
${winner.comment}

`;
  });

  text += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YouTube Comment Picker - Works on Videos, Shorts & Community Posts
Developed by oniisama
`;

  return text;
}

/**
 * Download file
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Adjust winner count with +/- buttons
 */
function adjustWinnerCount(delta) {
  const current = parseInt(elements.winnerCount.value) || 1;
  const max = parseInt(elements.winnerCount.max) || 1;
  const newValue = Math.max(1, Math.min(max, current + delta));
  elements.winnerCount.value = newValue;
}

/**
 * Open comments modal
 */
function openCommentsModal() {
  elements.commentsModal.classList.add('active');
  displayAllCommentsInModal();
}

/**
 * Close comments modal
 */
function closeCommentsModal() {
  elements.commentsModal.classList.remove('active');
}

/**
 * Display all comments in modal
 */
function displayAllCommentsInModal() {
  elements.modalCommentsList.innerHTML = '';

  filteredComments.forEach((comment, index) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <div class="preview-username"><i class="fas fa-user"></i> ${escapeHtml(comment.username)}</div>
      <div class="preview-comment">${escapeHtml(comment.comment)}</div>
    `;
    elements.modalCommentsList.appendChild(item);
  });
}

/**
 * Search comments in modal
 */
let searchTimeout;
function searchModalComments() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = elements.modalSearch.value.toLowerCase();
    const items = elements.modalCommentsList.querySelectorAll('.preview-item');

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? 'block' : 'none';
    });
  }, 300);
}

/**
 * Show preview of filtered comments
 */
function showPreview() {
  elements.previewList.innerHTML = '';

  const previewComments = filteredComments.slice(0, 5);

  if (previewComments.length === 0) {
    elements.previewList.innerHTML = '<p style="text-align: center; color: #999;">No comments match your filters</p>';
    return;
  }

  previewComments.forEach(comment => {
    const item = document.createElement('div');
    item.className = 'preview-item';

    const truncatedComment = comment.comment.length > 80
      ? comment.comment.substring(0, 80) + '...'
      : comment.comment;

    item.innerHTML = `
      <div class="preview-username"><i class="fas fa-user"></i> ${escapeHtml(comment.username)}</div>
      <div class="preview-comment">${escapeHtml(truncatedComment)}</div>
    `;

    elements.previewList.appendChild(item);
  });
}

/**
 * Update statistics display
 */
function updateStats() {
  elements.totalComments.textContent = allComments.length;

  const uniqueCount = new Set(allComments.map(c => c.username.toLowerCase())).size;
  elements.uniqueUsers.textContent = uniqueCount;

  elements.filteredCount.textContent = filteredComments.length;

  // Animate numbers
  animateValue(elements.totalComments, 0, allComments.length, 500);
  animateValue(elements.uniqueUsers, 0, uniqueCount, 500);
  animateValue(elements.filteredCount, 0, filteredComments.length, 500);
}

/**
 * Animate number counting up
 */
function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= end) {
      element.textContent = end;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 16);
}

/**
 * Update status message
 */
function updateStatus(message, type = '') {
  elements.statusText.textContent = message;
  elements.statusBar.className = 'status-bar glass-effect ' + type;
}

/**
 * Update elapsed time
 */
function updateElapsedTime() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  elements.timeInfo.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Play winner sound effect
 */
function playWinnerSound() {
  // Create a simple beep sound using Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    // Silently fail if audio not supported
  }
}

/**
 * Launch confetti animation
 */
function launchConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  canvas.style.display = 'block';

  const particles = [];
  const particleCount = 200;
  const colors = ['#ff0844', '#ff1744', '#ff4569', '#c9002f', '#ff6b9d', '#ff8fab'];

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * particleCount,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }

  let animationFrame;
  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.d);
      p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();

      // Reset particle when it goes off screen
      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
    });

    frame++;
    if (frame < 300) {
      animationFrame = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(animationFrame);
      canvas.style.display = 'none';
    }
  }

  draw();
}

// Initialize - Load saved session on startup
loadState().then(() => {
  // Only show initial message if no session was loaded
  if (allComments.length === 0) {
    updateStatus('Navigate to any YouTube page with comments and click "Extract Comments"', '');
  }
}).catch(error => {
  console.error('Error loading state:', error);
});

console.log('YouTube Comment Picker loaded! Works on Videos, Shorts & Community Posts 🎉');
