/**
 * Navbar trinket menu functionality for bloodmallet.com
 * Requires bm-charts.js to be loaded first
 */

// ==========================
// Utility Functions
// ==========================
  
  /**
   * Create a default state object with optional overrides
   */
  const createInitialState = (overrides = {}) => ({
    data_type: 'trinket_compare',
    fight_style: 'castingpatchwerk',
    wow_class: 'priest',
    item_name: 'Loading...',
    item_level: 'Loading...',
    item_levels: [],
    available_trinkets: [],
    ...overrides
  });
  
  /**
   * Create a click handler for menu items
   */
  const createItemClickHandler = (itemType, itemValue, state) => {
    return async (event) => {
      event.preventDefault();
      const newState = { ...state };
      newState[itemType] = itemValue;
      await updateTrinketChartViaMenu(newState);
    };
  };
  
  // ==========================
  // Data Fetching and Processing
  // ==========================
  
  /**
   * Fetch available trinket data
   */
  const fetchAvailableTrinkets = async (fightStyle) => {
    try {
      const fetchFunction = window.fetchAndProcessDataAsync ?? fetchAndProcessDataAsync;
      const data = await fetchFunction?.(fightStyle);

      if (!data) {
        throw new Error('No data returned from fetchAndProcessDataAsync');
      }

      return processTrinketsFromData(data);
    } catch (error) {
      console.error('Error fetching available trinkets:', error);
      return [];
    }
  };
  
  /**
   * Process trinket data into a usable format
   */
  const processTrinketsFromData = (data) => {
    const availableTrinkets = [];
    if (!data || !data.items) {
      console.warn('No trinket data available to process');
      return availableTrinkets;
    }
  
    try {
      // Detect user language
      const userLanguage = window.BmUIUtils?.detectUserLanguage() || 'en_US';
  
      for (const trinketKey in data.items) {
        if (trinketKey === 'baseline') {
          continue;
        }

        let trinketName = window.BmUIUtils?.formatText(trinketKey, window.BmUIUtils.FormatTypes.item_name); // Default formatting
  
        // Try to get localized name if available
        if (data.items[trinketKey].translations) {
          if (data.items[trinketKey].translations[userLanguage]) {
            trinketName = data.items[trinketKey].translations[userLanguage];
          } else if (data.items[trinketKey].translations.en_US) {
            trinketName = data.items[trinketKey].translations.en_US;
          }
        }
  
        availableTrinkets.push({
          key: trinketKey,
          name: trinketName
        });
      }
  
      return availableTrinkets.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error processing trinket data:', error);
      return [];
    }
  };
  
  /**
   * Get state from the chart
   */
  const getStateFromChart = async () => {
    const chart = document.getElementById('chart');
    const data = window.BmUIUtils.getChartData(chart);
    if (!data) return createInitialState();
    
    const fightStyle = data.simc_settings?.fight_style || 'castingpatchwerk';
    const availableTrinkets = await fetchAvailableTrinkets(fightStyle);
    
    return createInitialState({
      item_id: data.item_id,
      item_name: data.item_name,
      item_level: data.item_level,
      item_levels: data.item_levels,
      fight_style: fightStyle,
      available_trinkets: availableTrinkets
    });
  };
  
  /**
   * Complete a state object with default values
   */
  const completeStateWithDefaults = (state) => {
    const defaultItemLevel = state.item_levels?.[0] || '600';
    
    return {
      ...createInitialState(),
      ...state,
      item_level: state.item_level || defaultItemLevel
    };
  };
  
  // ==========================
  // UI Rendering
  // ==========================
  
  /**
   * Create menu items for the dropdown
   */
  const createDropdownMenuEntries = (items, id, state) => {
    console.debug('Creating dropdown menu entries for', id, items);
    const dropdownMenu = window.BmUIUtils.createElement('div', { 
      className: `dropdown-menu ${state.wow_class}-border-top`,
      'aria-labelledby': `navbar_${id}_selection`
    });
  
    // Handle different types of items
    if (!items) {
      // Add a placeholder when items is undefined or null
      const placeholder = window.BmUIUtils.createElement('a', {
        className: `dropdown-item ${state.wow_class}-button disabled`,
        innerText: 'Loading...'
      });
      dropdownMenu.appendChild(placeholder);
      return dropdownMenu;
    }
  
    // Set maximum height for long lists
    if (Array.isArray(items) && items.length > 10) {
      dropdownMenu.style.maxHeight = '400px';
      dropdownMenu.style.overflowY = 'scroll';
    }
  
    // Object containing fight style mappings
    if (id === 'fight_style' && !Array.isArray(items)) {
      // Handle the fight_style dictionary case
      Object.keys(items).forEach(key => {
        const menuItem = window.BmUIUtils.createElement('a', {
          className: `dropdown-item ${state.wow_class}-button`,
          id: `navbar_${window.BmUIUtils.formatText(key, 'slug')}_selector`,
          innerText: items[key],
          href: '#',
          events: {
            click: createItemClickHandler('fight_style', key, state)
          }
        });
        dropdownMenu.appendChild(menuItem);
      });
      return dropdownMenu;
    }
  
    // Array of items (trinkets or item levels)
    if (Array.isArray(items)) {
      items.forEach(item => {
        const itemValue = typeof item === 'object' ? item.key : item;
        const itemDisplay = typeof item === 'object' ? item.name : item;
        
        const menuItem = window.BmUIUtils.createElement('a', {
          className: `dropdown-item ${state.wow_class}-button`,
          id: `navbar_${window.BmUIUtils.formatText(itemValue, 'slug')}_selector`,
          innerText: itemDisplay,
          href: '#',
          events: {
            click: createItemClickHandler(id, itemValue, state)
          }
        });
        dropdownMenu.appendChild(menuItem);
      });
      return dropdownMenu;
    }
  
    // Default case - single item
    const menuItem = window.BmUIUtils.createElement('a', {
      className: `dropdown-item ${state.wow_class}-button`,
      id: `navbar_${window.BmUIUtils.formatText(items, 'slug')}_selector`,
      innerText: items,
      href: '#'
    });
    dropdownMenu.appendChild(menuItem);
  
    return dropdownMenu;
  };
  
  /**
   * Create a dropdown menu in the navbar
   */
  const createDropdownMenu = (label, id, items, state, parentElement) => {
    const li = window.BmUIUtils.createElement('li', { 
      className: 'nav-item dropdown' 
    });
    
    const a = window.BmUIUtils.createElement('a', {
      className: `nav-link dropdown-toggle ${state.wow_class}-color ${state.wow_class}-menu-border`,
      href: '#',
      role: 'button',
      'data-bs-toggle': 'dropdown',
      'aria-expanded': 'false',
      id: `navbar_${window.BmUIUtils.formatText(id, 'slug')}_selection`,
      innerText: label
    });
    
    li.appendChild(a);
    
    const divDropdown = createDropdownMenuEntries(items, id, state);
    li.appendChild(divDropdown);
    
    parentElement.appendChild(li);
    return li;
  };
  
  /**
   * Render the navbar menu
   */
  const renderNavbarMenu = (state) => {
    const navbarTrinketMenu = document.getElementById('navbarTrinketMenu');
    if (!navbarTrinketMenu) return;
    
    // Clear existing content
    navbarTrinketMenu.innerHTML = '';
    
    // Create the navigation list
    const navList = window.BmUIUtils.createElement('ul', { className: 'navbar-nav' });
    
    // Find the localized name for the currently selected trinket
    let selectedTrinketLocalizedName = state.item_name; // Default
    const selectedTrinket = state.available_trinkets.find(trinket => trinket.key === state.item_name);
    if (selectedTrinket) {
      selectedTrinketLocalizedName = selectedTrinket.name;
    }
    
    // Add the trinket dropdown
    createDropdownMenu(selectedTrinketLocalizedName, 'item_name', state.available_trinkets, state, navList);
    
    // Add the item level dropdown
    createDropdownMenu(state.item_level, 'item_level', state.item_levels, state, navList);
    
    // Add the fight style dropdown
    const fightStyles = {
        'castingpatchwerk': 'Casting Patchwerk 1 target',
        'castingpatchwerk3': 'Casting Patchwerk 3 targets', 
        'castingpatchwerk5': 'Casting Patchwerk 5 targets',
    };
    
    createDropdownMenu(
      window.BmUIUtils.formatText(state.fight_style, 'fight_style'), 
      'fight_style', 
      fightStyles, 
      state, 
      navList
    );
    
    navbarTrinketMenu.appendChild(navList);
  };
  
  /**
   * Update the navbar menu with a given state
   */
  const update_navbarTrinketMenu = async (state = {}) => {
    console.debug('update_navbarTrinketMenu', state);
    
    // Get current state or use provided state
    const finalState = Object.keys(state).length === 0 
      ? await getStateFromChart() 
      : completeStateWithDefaults(state);
      
    // Update the UI
    renderNavbarMenu(finalState);
  };
  
  // ==========================
  // Event Handling
  // ==========================
  
  /**
   * Update the trinket chart when menu options are changed
   */
  const updateTrinketChartViaMenu = async (state) => {
    const chart = document.getElementById('chart');
  
    // Store current selected values
    const currentSelection = {
      item_name: state.item_name,
      item_level: state.item_level,
      fight_style: state.fight_style
    };
  
    try {
      // First, check if we need to adjust the item level based on trinket availability
      const data = await getTrinketDataAsync(state.item_name, state.item_level, state.fight_style);
      const availableItemLevels = data.item_levels || [];
  
      // If currently selected item level isn't available for this trinket, use the first available one
      if (!availableItemLevels.includes(currentSelection.item_level)) {
        console.debug(`Item level ${currentSelection.item_level} not available for ${state.item_name}, using ${availableItemLevels[0]} instead`);
        currentSelection.item_level = availableItemLevels[0];
      }
  
      // Update the chart with adjusted values if needed
      await window.updateTrinketChartAsync(currentSelection);
  
      // Get the updated data from the chart
      const chartData = window.BmUIUtils.getChartData(chart);
      if (!chartData) {
        console.error('No chart data found after update');
        return;
      }
  
      // Update state with the new data
      const updatedState = {
        ...state,
        item_id: chartData.item_id,
        item_name: currentSelection.item_name,
        item_level: currentSelection.item_level,
        item_levels: chartData.item_levels,
        fight_style: currentSelection.fight_style,
        available_trinkets: state.available_trinkets
      };
  
      // Update the menu with the new state
      await update_navbarTrinketMenu(updatedState);
  
    } catch (error) {
      console.error('Error updating trinket chart:', error);
    }
  };
  
  /**
   * Initialize the trinket navbar menu
   */
  const initializeNavbarTrinketMenu = async () => {
    const chart = document.querySelector('.bloodmallet_chart');
    if (!chart || !chart.dataset.loadedData) {
      console.error('Chart data not available for menu initialization');
      return;
    }
  
    try {
      const chartData = window.BmUIUtils.getChartData(chart);
      console.debug('Initializing trinket menu with data:', chartData);
  
      // Get the current fight style from the chart
      const currentFightStyle = chartData.simc_settings?.fight_style || 'castingpatchwerk';
  
      // Fetch the list of available trinkets
      const availableTrinkets = await fetchAvailableTrinkets(currentFightStyle);
  
      // Update state with real data
      let state = createInitialState({
        fight_style: currentFightStyle,
        item_name: chartData.item_name,
        item_level: chartData.item_level,
        item_levels: chartData.item_levels || [],
        available_trinkets: availableTrinkets
      });
  
      await update_navbarTrinketMenu(state);
  
      console.debug(`Loaded ${availableTrinkets.length} available trinkets`);
  
      // Set up observer to watch for future changes
      const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-loaded-data') {
            const newChartData = window.BmUIUtils.getChartData(chart);
            if (!newChartData || !newChartData.item_name || !newChartData.item_level) continue;
            
            // If fight style changed, fetch new trinket list
            const newFightStyle = newChartData.simc_settings?.fight_style || state.fight_style;
            let availableTrinkets = state.available_trinkets;
  
            if (newFightStyle !== state.fight_style) {
              availableTrinkets = await fetchAvailableTrinkets(newFightStyle);
            }
  
            state = {
              ...state,
              item_name: newChartData.item_name,
              item_level: newChartData.item_level,
              item_levels: newChartData.item_levels || [],
              fight_style: newFightStyle,
              available_trinkets: availableTrinkets
            };
            
            await update_navbarTrinketMenu(state);
          }
        }
      });
  
      observer.observe(chart, {
        attributes: true,
        attributeFilter: ['data-loaded-data']
      });
    } catch (error) {
      console.error('Error initializing trinket menu:', error);
    }
  };
  
  // ==========================
  // Initialization
  // ==========================
  
  document.addEventListener('DOMContentLoaded', () => {
    console.debug('DOMContentLoaded - Trinket Menu');
    
    // Get the chart and set up initial state
    const chart = document.querySelector('.bloodmallet_chart');
    if (!chart) return;
  
    // Show loading state immediately
    update_navbarTrinketMenu(createInitialState());
  
    // Watch for chart data loading
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' &&
            mutation.attributeName === 'data-loaded-data' &&
            chart.dataset.loadedData) {
  
          // Data is now loaded, safe to initialize
          console.debug('Chart data loaded, initializing trinket menu');
          observer.disconnect();
          initializeNavbarTrinketMenu();
          return;
        }
      }
    });
  
    observer.observe(chart, {
      attributes: true,
      attributeFilter: ['data-loaded-data']
    });
  
    // Fallback - if chart already has data
    if (chart.dataset.loadedData) {
      console.debug('Chart data already loaded, initializing immediately');
      initializeNavbarTrinketMenu();
    }
  });