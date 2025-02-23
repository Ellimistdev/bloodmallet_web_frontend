if (typeof debug === 'undefined') {
    var debug = false;
}

document.addEventListener("DOMContentLoaded", async function () {
    if (debug) {
        console.log("DOMContentLoaded");
    }
    await initializeNavbarTrinketMenu();
});


let fight_style_dict = {
    "castingpatchwerk": "Casting Patchwerk 1 target",
    "castingpatchwerk3": "Casting Patchwerk 3 targets",
    "castingpatchwerk5": "Casting Patchwerk 5 targets",
};
const fight_styles = Object.keys(fight_style_dict).sort();

async function updateTrinketChartViaMenu(state) {
    await window.updateTrinketChartAsync(state);
    const jsonString = document.getElementById("chart").getAttribute("data-loaded-data");
    const dataObj = JSON.parse(jsonString);
    state.item_id = dataObj.item_id;
    state.item_name = formatText(dataObj.item_name, "item_name");
    state.item_level = dataObj.item_level;
    state.item_levels = dataObj.item_levels;
    state.fight_style = dataObj.simc_settings.fight_style;
    await update_navbarTrinketMenu(state);
}

async function initializeNavbarTrinketMenu() {
    // Get initial state from the chart
    const chart = document.querySelector('.bloodmallet_chart');
    if (!chart) return;

    // Wait for initial chart data to load
    const maxAttempts = 10;
    let attempts = 0;
    while (!chart.dataset.loadedData && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    let state = {
        data_type: 'trinket_compare',
        fight_style: 'castingpatchwerk',
        wow_class: 'priest'
    };

    // If chart data is loaded, update state with it
    if (chart.dataset.loadedData) {
        const data = JSON.parse(chart.dataset.loadedData);
        state = {
            ...state,
            item_name: formatText(data.item_name, "item_name"),
            item_level: data.item_level,
            item_levels: data.item_levels,
            fight_style: data.simc_settings?.fight_style || state.fight_style
        };
    }

    await update_navbarTrinketMenu(state);

    // Set up observer to watch for future changes
    const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-loaded-data') {
                const data = JSON.parse(chart.dataset.loadedData || '{}');
                if (data.item_name && data.item_level) {
                    state = {
                        ...state,
                        item_name: data.item_name,
                        item_level: data.item_level,
                        item_levels: data.item_levels,
                        fight_style: data.simc_settings?.fight_style || state.fight_style
                    };
                    await update_navbarTrinketMenu(state);
                }
            }
        }
    });

    observer.observe(chart, {
        attributes: true,
        attributeFilter: ['data-loaded-data']
    });
}

async function update_navbarTrinketMenu(state = {}) {
    if (debug) {
        console.log("update_navbarTrinketMenu");
    }

    // set defaults
    const default_item_level = state.item_levels ? state.item_levels[0] : '600';
    const default_item_id = Object.keys(TRINKETS.items)[0];
    state.data_type ??= 'trinket_compare';
    state.item_id ??= default_item_id;
    state.item_name ??= TRINKETS.items[default_item_id].translations.en_US;
    state.item_level ??= default_item_level;
    state.item_levels ??= TRINKETS.baseline.item_levels;
    state.fight_style ??= fight_styles[0];
    state.wow_class = 'priest';

    const navbarTrinketMenu = document.getElementById("navbarTrinketMenu");

    // Remove existing dropdown menus
    while (navbarTrinketMenu.firstChild) {
        navbarTrinketMenu.removeChild(navbarTrinketMenu.firstChild);
    }

    const ul_nav = document.createElement("ul");
    ul_nav.className = "navbar-nav";

    const createDropdownMenu = (label, id, items) => {
        const li = document.createElement("li");
        li.className = "nav-item dropdown";
        ul_nav.appendChild(li);

        const a = document.createElement("a");
        a.className = `nav-link dropdown-toggle ${state.wow_class}-color ${state.wow_class}-menu-border`;
        a.href = "#";
        a.setAttribute("role", "button");
        a.setAttribute("data-bs-toggle", "dropdown");
        a.setAttribute("aria-expanded", "false");
        a.id = `navbar_${formatText(id, "slug")}_selection`;
        a.innerText = label;
        li.appendChild(a);

        const divDropdown = createDropdownMenuEntries(items, id, state);
        li.appendChild(divDropdown);
    }

    // Add trinket selection (dropdown)
    createDropdownMenu(state.item_name, "item_name", TRINKETS.items.map((item) => item.translations.en_US));

    // Add item level selection (dropdown)
    createDropdownMenu(formatText(state.item_level, "item_level"), "item_level", state.item_levels);

    // Add fight style selection (dropdown)
    createDropdownMenu(formatText(state.fight_style, "fight_style"), "fight_style", fight_styles);

    navbarTrinketMenu.appendChild(ul_nav);
}

const formatText = (item, id) => {
    switch (id) {
        case "slug":
            return item.replaceAll(" ", "_").toLowerCase();
        case "item_name":
        case "item_level":
            return capitalize_first_letters(item).replaceAll("_", " ");
        case "fight_style":
            return fight_style_dict[item];
        default:
            return item;
    }
}

const createDropdownMenuEntries = (items, id, state) => {
    const dropdownMenu = document.createElement("div");
    dropdownMenu.className = `dropdown-menu ${state.wow_class}-border-top`;
    dropdownMenu.setAttribute("aria-labelledby", `navbar_${id}_selection`);

    if (items.length > 10) {
        dropdownMenu.style.maxHeight = "400px";
        dropdownMenu.style.overflowY = "scroll";
    }

    const dropdownItems = items.map((item) => {
        const slug = formatText(item, "slug")
        const a = document.createElement("a");
        a.className = `dropdown-item ${state.wow_class}-button`;
        a.id = `navbar_${slug}_selector`;
        a.innerText = formatText(item, id);
        a.href="#";

        // Add event listener to handle the selection
        const handleSelection = async (event) => {
            event.preventDefault();
            state[id] = slug;
            await updateTrinketChartViaMenu(state);
        };

        a.addEventListener("click", handleSelection);

        return a;
    });

    dropdownMenu.append(...dropdownItems);
    return dropdownMenu;
}

/**
 * Capitalize all first letters in a string.
 * Example: string_test -> String_Test
 */
function capitalize_first_letters(string) {
    let new_string = string.charAt(0).toUpperCase();
    if (string.indexOf("_") > -1) {
        new_string += string.slice(1, string.indexOf("_") + 1);
        new_string += capitalize_first_letters(string.slice(string.indexOf("_") + 1));
    } else {
        new_string += string.slice(1);
    }
    return new_string;
}
