const BmTooltipClass = {
    TOOLTIP: "bm-tooltip",
    ARROW: "bm-tooltip-arrow",
    INNER: "bm-tooltip-inner",
    TOP: "bm-tooltip-top",
    BOTTOM: "bm-tooltip-bottom",
    LEFT: "bm-tooltip-left",
    RIGHT: "bm-tooltip-right",
}

const BmTooltipAttribute = {
    ID: "data-bm-tooltip-id",
    TEXT: "data-bm-tooltip-text",
    PLACEMENT: "data-bm-tooltip-placement"
}

const BmTooltipStyleId = "bm-tooltip-styles";
const BmTooltipStyleUrl = "/static/general_website/css/bm-tooltips.css";

/**
 * Inject css into head
 * @param {String} id id of the styles element in the website
 * @param {String} url url to the styles
 * @returns Nothing
 */
function bm_add_css(id, url) {
    if (document.getElementById(id)) {
        return;
    }

    let styles = document.createElement("link");
    styles.id = id;
    styles.rel = "stylesheet";
    styles.type = "text/css";
    styles.href = url + "?now=" + Date.now();
    styles.media = "all";
    document.getElementsByTagName('head')[0].appendChild(styles);
}


/**
 * Register all tooltip-events.
 * @param {Element} element 
 */
function bm_register_tooltip(element) {

    if (element.hasAttribute(BmTooltipAttribute.ID)) {
        // console.log(BmTooltipAttribute.ID + " found. Tooltip was already registered. Skipping registration of tooltip.");
        return;
    }


    /**
     * Generate a random int.
     * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
     * @param {number} max 
     * @returns 
     */
    function get_random_int(max) {
        return Math.floor(Math.random() * max);
    }

    function get_unique_random_int() {
        let max = 999999;
        let random_id = get_random_int(max);
        while (document.querySelectorAll(`[${BmTooltipAttribute.ID}='bm-tooltip-${random_id}']`).length !== 0) {
            console.debug(`We won! Somehow ID ${random_id} was already in use. Regenerating a new ID.`);
            random_id = get_random_int(max);
        }
        return random_id;
    }

    /**
     * Remove tooltip-div
     * @param {Element} element 
     */
    function remove_tooltip_div(element) {
        let id = element.getAttribute(BmTooltipAttribute.ID);
        if (!document.getElementById(id)) {
            return;
        }
        document.getElementById(id).remove();
    }

    /**
     * Create a tooltip-div
     * @param {Event} event 
     * @param {Element} element 
     * @param {number} random_id 
     */
    function create_tooltip(event, element) {
        // console.log(event);
        if (!element.hasAttribute(BmTooltipAttribute.TEXT)) {
            console.warn(BmTooltipAttribute.TEXT + " not found. Skipping creation of tooltip.");
            return;
        }

        /**
         * Source: https://stackoverflow.com/a/35385518
         * @param {String} HTML representing a single element
         * @return {Element}
         */
        function bm_html_to_element(html) {
            let template = document.createElement('template');
            html = html.trim(); // Never return a text node of whitespace as the result
            template.innerHTML = html;
            return template.content.firstChild;
        }

        /**
         * Convert attribute input to class name.
         * @param {string} placement user input from the element attribute
         * @returns string
         */
        function bm_get_placement_class(placement) {
            // default case
            if (placement === null) {
                placement = "bottom";
            }

            let placement_class = BmTooltipClass.BOTTOM;
            switch (placement) {
                case "top":
                    placement_class = BmTooltipClass.TOP;
                    break;
                case "bottom":
                    placement_class = BmTooltipClass.BOTTOM;
                    break;
                case "left":
                    placement_class = BmTooltipClass.LEFT;
                    break;
                case "right":
                    placement_class = BmTooltipClass.RIGHT;
                    break;
                default:
                    console.warn(`Unknown placement '${placement}' provided. Defaulting back to using '${placement_class}'.`);
                    break;
            }

            return placement_class
        }

        class Coordinate {
            /**
             * 
             * @param {number} x 
             * @param {number} y 
             */
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }

        /**
         * 
         * @param {Element} element 
         * @param {Element} tooltip 
         * @param {String} placement 
         * @returns Coordinate
         */
        function get_tooltip_position(element, tooltip, placement) {
            let x = 0;
            let y = 0;

            let element_box = element.getBoundingClientRect();
            let tooltip_box = tooltip.getBoundingClientRect();
            // console.log(element_box);
            // console.log(tooltip_box);

            if (placement === BmTooltipClass.TOP) {
                x = element_box.x + element_box.width / 2 - tooltip_box.width / 2;
                y = element_box.y - tooltip_box.height;
            } else if (placement === BmTooltipClass.BOTTOM) {
                x = element_box.x + element_box.width / 2 - tooltip_box.width / 2;
                y = element_box.y + element_box.height;
            } else if (placement === BmTooltipClass.LEFT) {
                x = element_box.x - tooltip_box.width;
                y = element_box.y + element_box.height / 2 - tooltip_box.height / 2;
                // 55.7
                // console.log(element_box.top, element_box.y, element_box.bottom, element_box.height);
            } else if (placement === BmTooltipClass.RIGHT) {
                x = element_box.x + element_box.width;
                y = element_box.y + element_box.height / 2 - tooltip_box.height / 2;
            }

            return new Coordinate(x, y);
        }

        // workaround, otherwise occasionally tooltips would stay
        remove_tooltip_div(element);

        let id = element.getAttribute(BmTooltipAttribute.ID);

        // tooltip root
        let root = document.createElement("div");
        root.id = id;
        root.classList.add(BmTooltipClass.TOOLTIP);
        let placement = bm_get_placement_class(element.getAttribute(BmTooltipAttribute.PLACEMENT));
        root.classList.add(placement);

        // tooltip arrow
        let arrow = document.createElement("div");
        arrow.classList.add(BmTooltipClass.ARROW);
        root.appendChild(arrow);

        // tooltip inner
        let inner = document.createElement("div");
        inner.classList.add(BmTooltipClass.INNER);
        let converted_html = bm_html_to_element(element.getAttribute(BmTooltipAttribute.TEXT));
        inner.appendChild(converted_html);
        root.appendChild(inner);

        // add tooltip to dom
        let body = document.querySelector("body");
        body.appendChild(root);

        // update tooltip root position based on content
        // must happen after adding to dom, otherwise no size is available
        let coordinates = get_tooltip_position(element, root, placement);
        root.style = `transform: translate(${coordinates.x}px, ${coordinates.y}px);`;
    }

    /**
     * 
     * @param {Element} element 
     */
    function set_tooltip_id(element) {
        let random_id = get_unique_random_int();
        let id = "bm-tooltip-" + random_id.toString();
        element.setAttribute(BmTooltipAttribute.ID, id);
    }

    bm_add_css(BmTooltipStyleId, BmTooltipStyleUrl);

    set_tooltip_id(element);
    element.addEventListener("mouseover", (event) => {
        create_tooltip(event, element);
    });

    // remove tooltip again
    element.addEventListener("mouseleave", (event) => {
        remove_tooltip_div(element);
    });
    // element.addEventListener("mouseout", (event) => {
    //     remove_tooltip_div(element);
    // });
}

/**
 * Ensures environment is prepared for bm-tooltips then registers all 
 * discovered tooltip targets.
 */
function bm_register_tooltips() {
    bm_add_css(BmTooltipStyleId, BmTooltipStyleUrl);

    let tooltip_elements = document.querySelectorAll("[data-type='bm-tooltip']");
    for (const e of tooltip_elements) {
        bm_register_tooltip(e);
    }
}
