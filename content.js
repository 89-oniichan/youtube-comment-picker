/**
 * Content Script - Extracts comments from YouTube Community Posts
 * Runs directly on YouTube pages
 */

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractComments') {
    try {
      const comments = extractAllComments();
      sendResponse({ success: true, comments: comments, count: comments.length });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep the message channel open for async response
});

/**
 * Extract all visible comments from the current YouTube page
 */
function extractAllComments() {
  const comments = [];
  const seenUsernames = new Set();

  // Find all comment elements on the page
  // YouTube uses 'ytd-comment-thread-renderer' for main comments
  const commentElements = document.querySelectorAll('ytd-comment-thread-renderer');

  let successfulExtractions = 0;
  let failedTimestamps = 0;

  commentElements.forEach((element, index) => {
    try {
      // Extract username
      const authorElement = element.querySelector('#author-text');
      const username = authorElement ? authorElement.textContent.trim() : null;

      // Extract comment text
      const contentElement = element.querySelector('#content-text');
      const commentText = contentElement ? contentElement.textContent.trim() : null;

      // Extract timestamp (try multiple selectors for different YouTube layouts)
      let timestamp = 'Just now';

      // Try to find timestamp element with various selectors
      const timestampSelectors = [
        'a.yt-simple-endpoint.style-scope.yt-formatted-string',
        '.published-time-text a',
        'yt-formatted-string.published-time-text a',
        '#published-time-text a',
        'a[href*="/watch"]', // Sometimes timestamp is a link
        '.published-time-text',
        'yt-formatted-string.published-time-text',
        '#published-time-text'
      ];

      for (const selector of timestampSelectors) {
        const timestampElement = element.querySelector(selector);
        if (timestampElement) {
          const text = timestampElement.textContent.trim();
          // Check if it looks like a timestamp (contains "ago", "edited", or time units)
          if (text && (text.includes('ago') || text.includes('edited') ||
              /\d+\s*(second|minute|hour|day|week|month|year)/i.test(text))) {
            timestamp = text;
            break;
          }
        }
      }

      // Fallback: Look for any element with timestamp-like text
      if (timestamp === 'Just now') {
        const allLinks = element.querySelectorAll('a');
        for (const link of allLinks) {
          const text = link.textContent.trim();
          if (text && (text.includes('ago') || /\d+\s*(second|minute|hour|day|week|month|year)/i.test(text))) {
            timestamp = text;
            break;
          }
        }
      }

      // Last resort: Try aria-label
      if (timestamp === 'Just now') {
        const linkElements = element.querySelectorAll('a[aria-label]');
        for (const link of linkElements) {
          const ariaLabel = link.getAttribute('aria-label') || '';
          if (ariaLabel.includes('ago')) {
            const match = ariaLabel.match(/(\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago)/i);
            if (match) {
              timestamp = match[1];
              break;
            }
          }
        }
      }

      // Extract profile link (if available)
      const profileLink = authorElement ? authorElement.href : '';

      // Track timestamp extraction success
      if (timestamp === 'Just now') {
        failedTimestamps++;
      }

      // Only add valid comments with unique usernames
      if (username && commentText && username !== 'Unknown User') {
        successfulExtractions++;
        comments.push({
          id: `comment_${index}`,
          username: username,
          comment: commentText,
          timestamp: timestamp,
          profileLink: profileLink
        });
      }
    } catch (error) {
      console.error('Error extracting comment:', error);
    }
  });

  // Log extraction statistics
  console.log(`YouTube Giveaway Pro: Extracted ${comments.length} comments`);
  console.log(`- Successful: ${successfulExtractions}`);
  console.log(`- Timestamps not found: ${failedTimestamps}`);
  if (failedTimestamps > 0) {
    console.log(`Note: ${failedTimestamps} comments showing "Just now" - timestamps may not be visible or loaded yet`);
  }

  return comments;
}

// Helper function to check if we're on a page with comments
function isOnYouTubePage() {
  return window.location.href.includes('youtube.com');
}

// Log when the extension is active
if (isOnYouTubePage()) {
  console.log('YouTube Comment Picker: Ready to extract comments from Videos, Shorts, or Community Posts!');
}
