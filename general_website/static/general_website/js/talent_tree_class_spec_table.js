if (typeof debug === 'undefined') {
    var debug = false;
}

document.addEventListener("DOMContentLoaded", function () {
    if (debug) {
        console.log("DOMContentLoaded");
    }
    build_table();
    if (!window.location.hash) {
        // create spec table only if no spec was already in link
        // register click events to hide spec table
        //register_class_spec_hiders();
    }
});


/**
 * Create the Spec choice table on the data index page.
 * Needs element with id 'spec_table'
 */
function build_table() {
    if (debug) {
        console.log("build_table");
    }
    let table = document.getElementById('spec_table');

    // start creating table cells for each class
    for (const wow_class of Object.keys(classes_specs)) {
        // fill class cell
        let div_class_cell = document.createElement('div');
        div_class_cell.className = 'col-xl-3 col-md-4 col-6 spec-cell';

        // create class header
        let div_class_name_row = document.createElement('div');
        div_class_name_row.className = 'row';
        div_class_cell.appendChild(div_class_name_row);
        let div_class_name = document.createElement('div');
        div_class_name.className = 'wow-class-header-content col-12 ' + wow_class + '-border-bottom ' + wow_class + '-color translate_' + wow_class;
        div_class_name.innerHTML = capitalize_first_letters(wow_class).replace("_", " ");
        div_class_name_row.appendChild(div_class_name);

        // add specs
        for (const wow_spec of classes_specs[wow_class]) {
            let div_spec_row = document.createElement('div');
            div_spec_row.className = 'row';
            div_class_cell.appendChild(div_spec_row);
            let div_spec_btn = document.createElement('div');
            // It's a simulated spec
            if ([
                "death_knight_blood",
                "death_knight_frost",
                "death_knight_unholy",
                "demon_hunter_havoc",
                "demon_hunter_vengeance",
                "druid_balance",
                "druid_feral",
                "druid_guardian",
                "druid_restoration",
                "evoker_devastation",
                "evoker_preservation",
                "hunter_beast_mastery",
                "hunter_marksmanship",
                "hunter_survival",
                "mage_arcane",
                "mage_fire",
                "mage_frost",
                "monk_brewmaster",
                "monk_mistweaver",
                "monk_windwalker",
                "paladin_holy",
                "paladin_protection",
                "paladin_retribution",
                "priest_discipline",
                "priest_holy",
                "priest_shadow",
                "rogue_assassination",
                "rogue_outlaw",
                "rogue_subtlety",
                "shaman_elemental",
                "shaman_enhancement",
                "shaman_restoration",
                "warlock_affliction",
                "warlock_demonology",
                "warlock_destruction",
                "warrior_arms",
                "warrior_fury",
                "warrior_protection"
            ].indexOf(wow_class + "_" + wow_spec) > -1) {
                div_spec_btn.className = 'spec-btn ' + wow_class + '-button col-12 translate_' + wow_spec;

                div_spec_btn.addEventListener("click", () => {
                    update_talent_trees(wow_class, wow_spec);
                    update_talent_tree_title(wow_class, wow_spec);
                });
            } else {
                div_spec_btn.className = 'spec-btn ' + wow_class + '-button col-12 translate_' + wow_spec + ' btn-disabled';
                div_spec_btn.dataset.toggle = "tooltip";
                div_spec_btn.dataset.placement = "top";
                div_spec_btn.dataset.title = "Disabled until tree data is available.";
            }

            div_spec_btn.innerHTML = capitalize_first_letters(wow_spec).replaceAll("_", " ");
            div_spec_row.appendChild(div_spec_btn);
        }
        table.appendChild(div_class_cell);
    }
    // $('[data-toggle="tooltip"]').tooltip();
    let tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
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

function remove_child_elements(element) {
    while (element.firstChild) {
        element.removeChild(element.lastChild);
    }
}

function update_talent_tree_title(wow_class, wow_spec) {
    let element = document.getElementById("btt-talent-tree-title");
    remove_child_elements(element);

    let spec_class_name = capitalize_first_letters(wow_spec) + " " + capitalize_first_letters(wow_class);
    spec_class_name = spec_class_name.replaceAll("_", " ");

    element.appendChild(
        document.createTextNode(spec_class_name)
    );

    element.scrollIntoView();
}

function update_talent_trees(wow_class, wow_spec) {
    for (let id of ["btt-class-tree", "btt-spec-tree"]) {
        let class_tree = document.getElementById(id);
        class_tree.dataset.wowClass = wow_class;
        class_tree.dataset.wowSpec = wow_spec;
        remove_child_elements(class_tree);
    }
    // dependency
    add_bloodmallet_trees();
}
