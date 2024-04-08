if (typeof debug === 'undefined') {
    var debug = false;
}

document.addEventListener("DOMContentLoaded", function () {
    if (debug) {
        console.log("DOMContentLoaded");
    }
    update_navbarTrinketMenu(get_state());
});

const fight_style_dict = {
    "castingpatchwerk": "Casting Patchwerk 1 target",
    "castingpatchwerk3": "Casting Patchwerk 3 targets",
    "castingpatchwerk5": "Casting Patchwerk 5 targets",
};
const fight_styles = Object.keys(fight_style_dict).sort();

const item_levels = [
    "447",
    "450",
    "454",
    "463",
    "476",
    "480",
    "483",
    "486",
    "489"
];

const trinkets_s3 = [
    "accelerating_sandglass",
    "alacritous_alchemist_stone",
    "algeth'ar_puzzle_box",
    "ashes_of_the_embersoul",
    "augury_of_the_primal_flame",
    "balefire_branch",
    "bandolier_of_twisted_blades",
    "beacon_to_the_beyond",
    "belor'relos,_the_suncaller",
    "branch_of_the_tormented_ancient",
    "caged_horror",
    "cataclysmic_signet_brand",
    "coagulated_genesaur_blood",
    "coiled_serpent_idol",
    "corrupted_starlight",
    "darkmoon_deck_box:_dance_[azurescale]",
    "darkmoon_deck_box:_dance_[bronzescale]",
    "darkmoon_deck_box:_dance_[emberscale]",
    "darkmoon_deck_box:_dance_[jetscale]",
    "darkmoon_deck_box:_dance_[none]",
    "darkmoon_deck_box:_dance_[sagescale]",
    "darkmoon_deck_box:_dance",
    "darkmoon_deck_box:_inferno_[azurescale]",
    "darkmoon_deck_box:_inferno_[bronzescale]",
    "darkmoon_deck_box:_inferno_[emberscale]",
    "darkmoon_deck_box:_inferno_[jetscale]",
    "darkmoon_deck_box:_inferno_[none]",
    "darkmoon_deck_box:_inferno_[sagescale]",
    "darkmoon_deck_box:_inferno",
    "darkmoon_deck_box:_rime_[azurescale]",
    "darkmoon_deck_box:_rime_[bronzescale]",
    "darkmoon_deck_box:_rime_[emberscale]",
    "darkmoon_deck_box:_rime_[jetscale]",
    "darkmoon_deck_box:_rime_[none]",
    "darkmoon_deck_box:_rime_[sagescale]",
    "darkmoon_deck_box:_rime",
    "darkmoon_deck_box:_watcher",
    "dragonfire_bomb_dispenser",
    "echoing_tyrstone",
    "elementium_pocket_anvil",
    "ember_of_nullification",
    "enduring_dreadplate",
    "erupting_spear_fragment",
    "frenzying_signoll_flare",
    "fyrakk's_tainted_rageheart",
    "gift_of_ursine_vengeance",
    "globe_of_jagged_ice",
    "gore-crusted_butcher's_block",
    "harlan's_loaded_dice",
    "heart_of_thunder",
    "homeland_raid_horn",
    "idol_of_pure_decay",
    "idol_of_the_dreamer",
    "idol_of_the_earth-warder",
    "idol_of_the_life-binder",
    "idol_of_the_spell-weaver",
    "igneous_flowstone_[high_tide]",
    "igneous_flowstone_[low_tide]",
    "irideus_fragment",
    "lady_waycrest's_music_box",
    "lingering_sporepods",
    "mark_of_dargrul",
    "might_of_the_ocean",
    "mirror_of_fractured_tomorrows",
    "mutated_magmammoth_scale",
    "my'das_talisman",
    "naraxas'_spiked_tongue",
    "neltharion's_call_to_chaos",
    "neltharion's_call_to_dominance",
    "neltharion's_call_to_suffering",
    "nightmare_egg_shell",
    "nymue's_unraveling_spindle",
    "oakheart's_gnarled_root",
    "obsidian_gladiator's_badge_of_ferocity",
    "obsidian_gladiator's_emblem",
    "obsidian_gladiator's_insignia_of_alacrity",
    "obsidian_gladiator's_medallion",
    "obsidian_gladiator's_sigil_of_adaptation",
    "ominous_chromatic_essence_[azure]",
    "ominous_chromatic_essence_[azure+all]",
    "ominous_chromatic_essence_[bronze]",
    "ominous_chromatic_essence_[bronze+all]",
    "ominous_chromatic_essence_[emerald]",
    "ominous_chromatic_essence_[emerald+all]",
    "ominous_chromatic_essence_[obsidian]",
    "ominous_chromatic_essence_[obsidian+all]",
    "ominous_chromatic_essence_[ruby]",
    "ominous_chromatic_essence_[ruby+all]",
    "paracausal_fragment_of_azzinoth",
    "paracausal_fragment_of_doomhammer",
    "paracausal_fragment_of_frostmourne",
    "paracausal_fragment_of_seschenal",
    "paracausal_fragment_of_shalamayne",
    "paracausal_fragment_of_sulfuras",
    "paracausal_fragment_of_thunderfin",
    "humid_blade_of_the_tideseeker",
    "paracausal_fragment_of_val'anyr",
    "pip's_emerald_friendship_badge",
    "porcelain_crab",
    "prophetic_stonescales",
    "rezan's_gleaming_eye",
    "rotcrusted_voodoo_doll",
    "screaming_black_dragonscale",
    "sea_star",
    "shard_of_rokmora",
    "spiked_counterweight",
    "spoils_of_neltharus",
    "spores_of_alacrity",
    "sustaining_alchemist_stone",
    "time-breaching_talon",
    "time-thief's_gambit",
    "treemouth's_festering_splinter",
    "vessel_of_searing_shadow",
    "vessel_of_skittering_shadows",
    "vial_of_animated_blood",
    "ward_of_faceless_ire",
    "witherbark's_branch",
    "zaqali_chaos_grapnel,"
];

/**
 * Checks url pathname for data and returns all provided information or default values.
 */
function get_state() {
    if (debug) {
        console.log("update_state_from_path");
    }

    const path = window.location.pathname;
    const [simulation_type, item_name, item_level, fight_style] = path.split("/").slice(2, 6);
    return { simulation_type, item_name, item_level, fight_style };
}

async function updateTrinketChart() {
    const selectedTrinket = document.getElementById('trinket-select').value;
    const selectedItemLevel = document.getElementById('item-level-select').value;
    const selectedFightStyle = document.getElementById('fight-style-select').value;

    await window.updateTrinketChart(selectedTrinket, selectedItemLevel, selectedFightStyle);
    await update_navbarTrinketMenu({ item_name: selectedTrinket, item_level: selectedItemLevel, fight_style: selectedFightStyle });
    
    const trinketSelect = document.getElementById('trinket-select');
    const itemLevelSelect = document.getElementById('item-level-select');
    const fightStyleSelect = document.getElementById('fight-style-select');

    if (trinketSelect) trinketSelect.addEventListener('change', updateTrinketChart);
    else console.error('trinket-select not found');

    if (itemLevelSelect) itemLevelSelect.addEventListener('change', updateTrinketChart);
    else console.error('item-level-select not found');

    if (fightStyleSelect) fightStyleSelect.addEventListener('change', updateTrinketChart);
    else console.error('fight-style-select not found');
}

async function update_navbarTrinketMenu(state) {
    if (debug) {
        console.log("update_navbarTrinketMenu");
    }

    // set defaults
    state.item_name ??= trinkets_s3[0];
    state.item_level ??= item_levels[0];
    state.fight_style ??= fight_styles[0];
    state.wow_class = "priest";


    const navbarTrinketMenu = document.getElementById("navbarTrinketMenu");
    const ul_nav = document.createElement("ul");
    ul_nav.className = "navbar-nav";

    const createDropdownMenu = (label, id, value) => {
        const li = document.createElement("li");
        li.className = "nav-item dropdown";
        ul_nav.appendChild(li);

        const a = document.createElement("a");
        a.className = `nav-link dropdown-toggle ${state.wow_class}-color ${state.wow_class}-menu-border`;
        a.href = "";
        a.setAttribute("data-toggle", "dropdown");
        a.setAttribute("aria-haspopup", "true");
        a.setAttribute("aria-expanded", "false");
        a.id = `navbar_${id}_selection`;
        a.innerText = label;
        li.appendChild(a);

        const divDropdown = createDropdownMenuEntries(value, id, state);
        li.appendChild(divDropdown);
    }

    // Add trinket selection (dropdown)
    createDropdownMenu(formatText(state.item_name, "item_name"), "item_name", trinkets_s3);

    // Add item level selection (dropdown)
    createDropdownMenu(formatText(state.item_level, "item_level"), "item_level", item_levels);

    // Add fight style selection (dropdown)
    createDropdownMenu(fight_style_dict[state.fight_style], "fight_style", fight_styles);

    // replace old navigation with new styled one
    while (navbarTrinketMenu.firstChild) {
        navbarTrinketMenu.removeChild(navbarTrinketMenu.firstChild);
    }
    navbarTrinketMenu.appendChild(ul_nav);
}

const formatText = (item, id) => {
    switch (id) {
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
        const a = document.createElement("a");
        a.className = `dropdown-item ${state.wow_class}-button`;
        a.id = `navbar_${item}_selector`;
        a.innerText = formatText(item, id);
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
    if (debug) {
        console.log("capitalize_first_letters");
    }
    let new_string = string.charAt(0).toUpperCase();
    if (string.indexOf("_") > -1) {
        new_string += string.slice(1, string.indexOf("_") + 1);
        new_string += capitalize_first_letters(string.slice(string.indexOf("_") + 1));
    } else {
        new_string += string.slice(1);
    }
    return new_string;
}
