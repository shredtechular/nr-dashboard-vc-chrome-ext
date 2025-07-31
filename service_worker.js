// Function to fetch dashboard JSON from New Relic
async function getNewRelicDashboardJson(guid, apiKey) {
  // const query = `
  //   query GetDashboard($guid: EntityGuid!) {
  //     actor {
  //       entity(guid: $guid) {
  //         ... on DashboardEntity {
  //           dashboardParent {
  //             json
  //           }
  //         }
  //       }
  //     }
  //   }
  // `;
  const query = `
    query GetDashboard($guid: EntityGuid!) {
      actor {
        entity(guid: $guid) {
          ... on DashboardEntity {
            name
            description
            permissions
            pages {
              widgets {
                visualization {
                  id
                }
                title
                layout {
                  column
                  height
                  row
                  width
                }
                rawConfiguration
              }
              name
              description
            }
            variables {
              name
              items {
                title
                value
              }
            }
          }
        }
      }
    }
  `;
  const variables = { guid };

  try {
    const response = await fetch('https://api.newrelic.com/graphql', { // Or https://api.eu.newrelic.com/graphql for EU accounts
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey
      },
      body: JSON.stringify({ query, variables })
    });

    // const data = await response.json();
    const data = await response.text();
    if (data.errors) {
      console.error('New Relic GraphQL Errors:', data.errors);
      throw new Error(data.errors[0].message || 'Error fetching New Relic dashboard.');
    }
    const datajson = JSON.parse(data);
    return datajson.data.actor.entity;
    // return JSON.parse(data.data.actor.entity.dashboardParent.json);
    return JSON.parse(data.data.actor.entity.dashboardParent.json);
  } catch (error) {
    console.error('Error fetching New Relic dashboard:', error);
    throw error;
  }
}

// Function to fetch file content from GitHub
async function getGitHubFileContent(owner, repo, path, branch, pat) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3.raw' // Get raw content
      }
    });

    // if (!response.ok) {
    //   console.error(`GitHub API Error: ${response.status} - ${response.statusText}`);
    //   throw new Error(`Failed to fetch file from GitHub: ${response.statusText}`);
    // }

    const content = await response.text();
    return JSON.parse(content);
  } catch (error) {
    console.error('Error fetching GitHub file:', error);
    throw error;
  }
}

// Deep compare JSON objects (simple version, for production consider a library like 'fast-deep-equal')
function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2); // Simplistic, order-sensitive. A better solution would sort keys or use a dedicated library.
}

/**
 * Sorts the keys of a JSON object alphabetically and returns a new object.
 * This function performs a shallow sort; nested objects will not have their
 * keys sorted recursively.
 *
 * @param {Object} jsonObject The input JSON object whose keys need to be sorted.
 * @returns {Object} A new object with the keys sorted alphabetically.
 */
function sortJsonKeys(data) {
  // Base case: If the data is not an object or is null, return it as is.
  // This handles primitive values, null, and undefined.
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // If the data is an array, iterate through its elements and recursively sort any nested objects.
  if (Array.isArray(data)) {
    return data.map(item => sortJsonKeys(item));
  }

  // If the data is a plain object, proceed to sort its keys.
  const keys = Object.keys(data);

  // Sort the keys alphabetically
  keys.sort();

  // Create a new object and populate it with keys in sorted order
  const sortedObject = {};
  for (const key of keys) {
    const value = data[key];
    // Recursively sort the value if it's an object or an array
    sortedObject[key] = sortJsonKeys(value);
  }

  return sortedObject;
}


/**
 * Compares two JSON objects deeply, ignoring the order of keys.
 * This function handles nested objects, arrays, and primitive values.
 *
 * @param {any} obj1 The first JSON object or value to compare.
 * @param {any} obj2 The second JSON object or value to compare.
 * @returns {boolean} True if the two objects are deeply equal, false otherwise.
 */
function areJsonEqual(obj1, obj2) {
  // 1. Strict equality check for primitive types and same object reference
  // if (obj1 === obj2) {
  //   return true;
  // }

  // 2. Handle null or non-object types
  // If either is null or not an object/array, and they weren't strictly equal, they are not equal.
  // if (obj1 === null || typeof obj1 !== 'object' ||
  //     obj2 === null || typeof obj2 !== 'object') {
  //   return false;
  // }

  // 3. Compare constructors to ensure they are of the same type (e.g., both Array or both Object)
  // if (obj1.constructor !== obj2.constructor) {
  //   return false;
  // }

  // // 4. Handle Arrays
  // if (Array.isArray(obj1)) {
  //   if (obj1.length !== obj2.length) {
  //     return false; // Arrays of different lengths are not equal
  //   }
  //   for (let i = 0; i < obj1.length; i++) {
  //     if (!areJsonEqual(obj1[i], obj2[i])) {
  //       return false; // Elements at the same index must be deeply equal
  //     }
  //   }
  //   return true; // All array elements are deeply equal
  // }

  // 5. Handle Objects
  // Get all keys from both objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Check if they have the same number of keys
  // if (keys1.length !== keys2.length) {
  //   return false;
  // }

  // Iterate over keys of the first object
  // for (const key of keys1) {
  //   // Check if the key exists in the second object AND if their values are deeply equal
  //   if (!keys2.includes(key) || !areJsonEqual(obj1[key], obj2[key])) {
  //     return false;
  //   }
  // }

  // If all checks pass, the objects are deeply equal
  return true;
}

/**
 * Recursively removes all key-value pairs with a specific key name from a JSON object or array.
 * This function traverses nested objects and arrays of objects, removing the specified key at all levels.
 *
 * @param {Object|Array} data The input JSON object or array from which keys need to be removed.
 * @param {string} keyToRemove The name of the key to be removed (e.g., "linkedEntityGuids").
 * @returns {Object|Array} A new object or array with the specified keys removed at all levels.
 */
function removeKeys(data, keyToRemove) {
  // Base case: If the data is not an object or is null, return it as is.
  // This handles primitive values, null, and undefined.
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // If the data is an array, iterate through its elements and recursively process each item.
  if (Array.isArray(data)) {
    return data.map(item => removeKeys(item, keyToRemove));
  }

  // If the data is a plain object, create a new object and populate it,
  // excluding the key to be removed and recursively processing other values.
  const newObject = {};
  for (const key in data) {
    // Ensure the key belongs to the object itself (not prototype chain)
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // If the current key is the one to be removed, skip it.
      if (key === keyToRemove) {
        continue;
      }
      const value = data[key];
      // Recursively process the value if it's an object or an array
      newObject[key] = removeKeys(value, keyToRemove);
    }
  }
  return newObject;
}

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'compareDashboards') {
    const dashboardGuid = request.guid;

    chrome.storage.sync.get(['newRelicApiKey', 'githubPat', 'githubOwner', 'githubRepo', 'githubBranch', 'githubDashboardPath'], async (items) => {
      const { newRelicApiKey, githubPat, githubOwner, githubRepo, githubBranch, githubDashboardPath } = items;

      if (!newRelicApiKey || !githubPat || !githubOwner || !githubRepo || !githubBranch || !githubDashboardPath) {
        sendResponse({ status: 'error', message: 'Extension settings are not configured. Please open the extension popup and save your API keys and repo details.' });
        return;
      }

      try {
        const currentDashboardJson = await getNewRelicDashboardJson(dashboardGuid, newRelicApiKey);
        // const githubFilePath = `${githubDashboardPath}${dashboardGuid}.json`; // Assumes GUID is part of filename
        const githubFilePath = `${githubDashboardPath}`; // Assumes GUID is part of filename
        const githubDashboardJson = await getGitHubFileContent(githubOwner, githubRepo, githubFilePath, githubBranch, githubPat);

        console.log (githubDashboardJson);

        const nrDashJson = sortJsonKeys(currentDashboardJson);
        const ghTempDashJson = sortJsonKeys(githubDashboardJson);
        const ghDashJson = removeKeys(ghTempDashJson, "linkedEntityGuids")
        const areEqual = deepEqual(nrDashJson, ghDashJson);
        sendResponse({ status: 'success', inSync: areEqual });

      } catch (error) {
        sendResponse({ status: 'error', message: `Comparison failed: ${error.message}` });
      }
    });
    return true; // Indicate that sendResponse will be called asynchronously
  }
});