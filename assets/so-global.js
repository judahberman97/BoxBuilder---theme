function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if(summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const soTrapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  soTrapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', soTrapFocusHandlers.keydown);
  };

  soTrapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', soTrapFocusHandlers.keydown);
  };

  soTrapFocusHandlers.keydown = function(event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', soTrapFocusHandlers.focusout);
  document.addEventListener('focusin', soTrapFocusHandlers.focusin);

  elementToFocus.focus();
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch(e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if(navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

    if (mouseClick) return;

    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('focused');

  }, true);
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', soTrapFocusHandlers.focusin);
  document.removeEventListener('focusout', soTrapFocusHandlers.focusout);
  document.removeEventListener('keydown', soTrapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

function capitalizeFirstLetterSubsequentLowercase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function formatMoney(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || document.getElementById('current_variant_id').getAttribute('data-shop-money-format');

  function formatWithDelimiters(number, precision, thousands, decimal) {
    thousands = thousands || ',';
    decimal = decimal || '.';

    if (isNaN(number) || number === null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    var parts = number.split('.');
    var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
    case 'amount_no_decimals_with_space_separator':
      value = formatWithDelimiters(cents, 0, ' ');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}

class SoQuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true })

    this.querySelectorAll('button').forEach(
      (button) => button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
}

customElements.define('so-quantity-input', SoQuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

/*
 * Shopify Common JS
 *
 */
if ((typeof window.Shopify) == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
};

Shopify.setSelectorByValue = function(selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function(target, eventName, callback) {
  target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on'+eventName, callback);
};

Shopify.postLink = function(path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for(var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
  this.countryEl         = document.getElementById(country_domid);
  this.provinceEl        = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function() {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function() {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function(e) {
    var opt       = this.countryEl.options[this.countryEl.selectedIndex];
    var raw       = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function(selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function(selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

class SoMenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    if (navigator.platform === 'iPhone') document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.querySelectorAll('button').forEach(button => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if(!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary')) : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if(isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches ? addTrapFocus() : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach(details => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach(submenu => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement)) this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    }

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('so-menu-drawer', SoMenuDrawer);

class SoHeaderDrawer extends SoMenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.getElementById('shopify-section-header');
    this.borderOffset = this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty('--header-bottom-position', `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`);
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
  }
}

customElements.define('so-header-drawer', SoHeaderDrawer);

class SoModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this, false)
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('so-deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    if (this.openedBy.getAttribute('id') == 'ProductPopup-button') {
      document.body.dispatchEvent(new CustomEvent('modalClosedFormSubmit'));
    }
    else
    {
      document.body.dispatchEvent(new CustomEvent('modalClosed'));
    }
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('so-modal-dialog', SoModalDialog);

class SoModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('so-modal-opener', SoModalOpener);

class SoUpsellPopupOpener extends HTMLElement {
  constructor() {
    super();

    this.form = document.getElementById(`product-form-${this.dataset.section}`);
    this.modalContent = document.querySelector(`#PopupModal-so-upsell`);
    if (this.form) {
      this.currentVariantID = this.form.querySelector('[name="id"]').value;
    }

    const button = this.querySelector('button');
    this.popupType = button.getAttribute('data-upsell-type');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (!this.validateFields()) {
        return
      }
      if(this.updateUpsellPopup()) {
        if (modal) modal.show(button);
      }
    });
  }

  // Submit form if upsell variant selected
  submitFormWithUpsellVariant(upsellVariant) {
    if(this.currentVariantID == upsellVariant.id) {
      this.form.dispatchEvent(new Event('submit'));
    }
    return this.currentVariantID != upsellVariant.id
  }

  // Check reuired engraving fields on PP
  validateFields() {
    const requiredInputs = document.querySelectorAll('.engraving-field');
    let isAnyRequiredInputEmpty = false;

    if(requiredInputs.length) {
      for (var i = 0; i < requiredInputs.length; i++) {
        let input = requiredInputs[i].querySelector('.field__input');
        if (!input.value && input.hasAttribute('required')) {
          isAnyRequiredInputEmpty = true;
          this.showTooltip(input.parentNode)
        }
      }
    }

    return !isAnyRequiredInputEmpty
  }

  // Show Tooltip if engraving fields on PP are empty
  showTooltip(parent) {
    if (parent.querySelector('.required-input-tooltip')) {
      parent.querySelector('.required-input-tooltip').style.display = 'block';
      return
    }
    var tooltipElem = document.createElement("div"),
        inputField = parent.querySelector('input'),
        patternMessage = inputField.getAttribute('data-pattern-message');
    
    tooltipElem.classList += 'required-input-tooltip';
    tooltipElem.style.position = 'absolute';
    tooltipElem.style.top = '-29px';
    tooltipElem.style.width = '100%';
    tooltipElem.style.backgroundColor = 'rgb(250, 146, 121)';
    tooltipElem.style.color = '#fff';
    tooltipElem.style.fontSize = '14px';
    tooltipElem.style.textAlign = 'center';
    tooltipElem.style.padding = '3px 0';
    tooltipElem.style.zIndex = '10';
    tooltipElem.style.display = 'block';
    tooltipElem.innerText = patternMessage;

    parent.position = 'relative';
    parent.classList += ' input-error';
    parent.insertBefore(tooltipElem, inputField);
  }

  getVariant(id) {
    const productVariants = JSON.parse(document.querySelector('.so-product-variants').textContent);
    let variant = productVariants.filter((productVariant) => productVariant.id == id)[0];
    return variant
  }

  getUpsellVariant() {
    this.currentVariantID = this.form.querySelector('[name="id"]').value;
    var regularVariant = this.getVariant(this.currentVariantID);
    document.getElementById('current_variant_id').value = this.currentVariantID;

    const productVariants = JSON.parse(document.querySelector('.so-product-variants').textContent);
    if (productVariants.length > 2) {
      let currentVariantOption1 = regularVariant.option1;

      const productVariantsMetafields = Array.from(document.querySelectorAll('.so-variant-metafields'));
      let upsellVariantID = productVariantsMetafields.filter((productVariantMetafield) => {
        return productVariantMetafield.getAttribute('data-so-variant-option1') == currentVariantOption1 && productVariantMetafield.hasAttribute('data-so-upsell-type');
      })[0].getAttribute('data-so-variant-id');

      var upsellVariant = productVariants.filter((productVariant) => productVariant.id == upsellVariantID);
    }
    else {
      let upsellVariantID = document.querySelector('[data-so-upsell-varinat_id]').getAttribute('data-so-upsell-varinat_id');
      var upsellVariant = productVariants.filter((productVariant) => productVariant.id == upsellVariantID);
    }

    if (upsellVariant) {
      return upsellVariant[0]
    }
  }

  updateUpsellPopup() {
    const upsellVariant = this.getUpsellVariant();
    this.setUpsellVariantImage(upsellVariant);
    this.setUpsellVariantPrice(upsellVariant);
    if (this.popupType != 'engraving') {
      this.setUpsellVariantID(upsellVariant);
      return this.submitFormWithUpsellVariant(upsellVariant)
    }
    else {
      return true
    }
  }

  // Upsell variant ID into form [name="id"]
  setUpsellVariantID(upsellVariant) {
    const input = this.form.querySelector('input[name="id"]');
    input.value = upsellVariant.id;
  }

  // Upsell variant featured image
  setUpsellVariantImage(upsellVariant) {
    const modalContentImage = this.modalContent.querySelector('.featured-image img');
    modalContentImage.srcset = upsellVariant.featured_image.src;
  }

  // Upsell variant price
  setUpsellVariantPrice(upsellVariant) {
    const compareUpsellPrice = this.modalContent.querySelector('.compare_upsell_price');
    const upsellPrice = this.modalContent.querySelector('.upsell_price');
    const savingPercents = this.modalContent.querySelector('.saving_percents');

    const selected_variant = this.getVariant(this.currentVariantID);

    let priceDifference = upsellVariant.price - selected_variant.price;
    compareUpsellPrice.textContent = formatMoney(priceDifference * 2);
    upsellPrice.textContent = formatMoney(priceDifference);
  }
}
customElements.define('so-upsell-popup-opener', SoUpsellPopupOpener);

class SoDeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
    }
  }
}

customElements.define('so-deferred-media', SoDeferredMedia);

class SoVariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
    window.addEventListener('load', this.setOriginalVariant.bind(this, false));
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.removeErrorMessage();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
    } else {
      this.getEngravingVariant();
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
    if(this.tagName != 'ENGRAVING-INPUT') {
      this.fontPreviewMetalColor();
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGallery = document.getElementById(`MediaGallery-${this.dataset.section}`);
    mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true);

    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector( `[data-media-id="${this.currentVariant.featured_media.id}"]`);
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      this.currentVariantID = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('so-product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const sourceSectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
    const destinationSectionId = this.dataset.section;

    fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${sourceSectionId}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const destination = document.getElementById(`price-${destinationSectionId}`);
        const source = html.getElementById(`price-${sourceSectionId}`);
        if (source && destination) destination.innerHTML = source.innerHTML;

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);

        const bannerDestination = document.getElementById(`product-banner-${destinationSectionId}`);
        const bannerSource = html.getElementById(`product-banner-${sourceSectionId}`);
        if (bannerDestination && bannerSource) bannerDestination.innerHTML = bannerSource.innerHTML;
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(document.querySelector('.so-product-variants').textContent);
    return this.getVariantMetafields(this.variantData);
  }

  // Extend Variants w/ Shineon metafields obj
  getVariantMetafields(variantData) {
    this.variants = [];
    var productVariantsMetafields = document.querySelectorAll('.so-variant-metafields');
    for (var i = 0; i < variantData.length; i++) {
      var variantMetafieldsData = JSON.parse(productVariantsMetafields[i].textContent);
      var variant = variantData[i];
      variant.metafields = variantMetafieldsData;
      this.variants.push(variant);
    }
    return this.variants;
  }

  setOriginalVariant(variantData) {
    if (this.querySelector('.so-selected-variant')) {
      var selectedVariant = JSON.parse(this.querySelector('.so-selected-variant').textContent);
      this.currentVariant = selectedVariant;

      var selector = '';
      for (var i = 0; i < selectedVariant.options.length; i++) {
        var option = selectedVariant.options[i],
            index = i + 1;
        selector += '[option' + index + '="' + option + '"]';
        for (let j = 0; j < document.querySelectorAll('[data-option="option' + index +'"]').length; j++) {
          const input = document.querySelectorAll('[data-option="option' + index +'"]')[j];
          if(input.value == option) {
            input.checked = true;
          }
        }
      }

      if (document.querySelector('[engravings="0"]')) {
        document.querySelector('[engravings="0"]').checked = true;
      }
      else if (document.querySelector(selector)) {
        document.querySelector(selector).checked = true;
      }

      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  getEngravingVariant() {
    var variants = this.getVariantData();
    for (var i = 0; i < variants.length; i++) {
      var variant = variants[i]
    }
    let currentPopupImage = document.querySelector('.featured-image img');
    if (currentPopupImage) {
      let currentPopupImageSrc = currentPopupImage.src.split(),
        currentPopupImageHeight = currentPopupImage.height;
      if (variant.option1 == this.currentVariant.option1 && variant.metafields.engravings > 0)
      {
        currentPopupImage.srcset = variant.featured_image.src;
        currentPopupImage.height = currentPopupImageHeight;
        return variant
      }
    }
  }
}

customElements.define('so-variant-selects', SoVariantSelects);

class VariantRestoreDefault extends SoVariantSelects {
  constructor() {
    super();

    this.form = document.querySelector('[data-type="add-to-cart-form"]');
    if (this.form) {
      this.form.querySelector('[name="id"]').disabled = false;
      this.currentVariantID = this.currentVariant ? this.currentVariant.id : this.form.querySelector('[name="id"]').value;
    }

    this.querySelector('.product-popup-modal__close').addEventListener(
      'click',
      this.submitForm.bind(this, false)
    );
    document.body.addEventListener(
      'modalClosedFormSubmit',
      this.submitForm.bind(this, false)
    );
    if (document.getElementById('ProductPopup-button')) {
      document.getElementById('ProductPopup-button').addEventListener(
        'click',
        this.getCurrectVariantID.bind(this, false)
      );
    }
  }

  getCurrectVariantID() {
    this.currentVariantID = document.getElementById('current_variant_id').value;
  }

  submitForm() {
    var option2 = this.getAttribute('data-option2');
    if (option2 == 'engraving') {
      var engraving_inputs = this.form.querySelectorAll('.so-engraving-input');
      for (var i = 0; i < engraving_inputs.length; i++) {
        engraving_inputs[i].value = '';
      }
    }
    this.form.querySelector('[name="id"]').value = this.currentVariantID;
    this.getVariantObj();
    this.form.dispatchEvent(new Event('submit'));
  }

  getVariantObj() {
    var variants = this.getVariantData();
    for (var i = 0; i < variants.length; i++) {
      if (variants[i].id == this.currentVariantID) {
        this.currentVariant = variants[i];
      }
    }
    this.updateMedia();
    this.updateURL();
    this.updateVariantInput();
    this.renderProductInfo();
    this.updateShareUrl();
  }
}

customElements.define('so-submit-default-form', VariantRestoreDefault);

class SoVariantRadios extends SoVariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }

  checkProductOptionSize() {
    const productVariants = JSON.parse(this.querySelector('.so-product-variants').textContent);
    return productVariants.length
  }

  fontPreviewMetalColor() {
    var fontPreviewWrapArr = Array.from(document.querySelectorAll('.font-preview-w'));
    fontPreviewWrapArr.map((item) => item.setAttribute('data-metal', this.currentVariant.metafields.metal));
  }
}

customElements.define('so-variant-radios', SoVariantRadios);

class EngravingInput extends SoVariantSelects {
  constructor() {
    super();
    this.productSwathces = document.querySelectorAll('fieldset.product-form__input [type="radio"]');
    this.engravingInput = document.querySelectorAll('.so-engraving-input');
    this.addEventListener('keyup', this.checkEngravingVariant);
    if(this.hasAttribute('data-font-preview')) {
      this.addEventListener('keydown', this.validateFontPreview);
      this.addEventListener('keyup', this.fontPreview);
      this.addEventListener('focusout', this.focusOutDev);
    }
  }

  focusOutDev() {
    var fontPreviewNotification = this.querySelector('.notification');
    fontPreviewNotification.style.display = 'none';
  }

  getVariantTitleByOptionValues () {
    var resulted_option_name = '',
        index = 0;
    for (var j = 0; j < this.productSwathces.length; j++) {
      if(this.productSwathces[j].checked) {
        resulted_option_name += this.productSwathces[j].value;
        index++;
        if (index < 2) {
          resulted_option_name += ' / ';
        }
      }
    }

    return resulted_option_name;
  }

  getVariantByOptionValues () {
    var variants = this.getVariantData();
    for (var i = 0, len = variants.length, variant = undefined; i < len; i++) {
      var resulted_option_name = this.getVariantTitleByOptionValues();
      if (variants[i].title == resulted_option_name) {
        variant = variants[i];
      }
    }

    return variant;
  }

  fontPreview() {
    var fontPrevieWrap = this.querySelector('.font-preview-w'),
        fontPreviewField = fontPrevieWrap.querySelector('.preview'),
        engravingInput = this.querySelector('.so-engraving-input'),
        counterWrap = this.querySelector('.so-input-counter');
    engravingInput.value = capitalizeFirstLetterSubsequentLowercase(engravingInput.value);
    fontPreviewField.textContent = engravingInput.value;
    counterWrap.textContent = engravingInput.value.length;
    fontPreviewField.style.display = 'block';
    if(engravingInput.value.length == 0) {
      fontPreviewField.style.display = 'none';
    }

    fontPreviewField.setAttribute('data-metal', this.getVariantByOptionValues().metafields.metal);
  }

  validateFontPreview(e) {
    if(!e.target.hasAttribute('data-pattern')) {
      return
    }
    var fontPreviewNotification = this.querySelector('.notification'),
        engravingInput = this.querySelector('.so-engraving-input'),
        engravingInputPattern = new RegExp(engravingInput.getAttribute('data-pattern'));
    if(!engravingInputPattern.test(e.key)) {
      e.preventDefault();
      fontPreviewNotification.style.display = 'flex';
      var e_key = e.keyCode == 32 ? 'Space' : e.key
      fontPreviewNotification.textContent = e_key + ' isn\'t available';
    }
    else {
      fontPreviewNotification.style.display = 'none';
    }
  }

  checkEngravingVariant() {
    var option2 = this.getAttribute('data-option2');
    this.passEngravingValueIntoPopupInput(this.querySelector('input'));
    this.removeShowTooltip(this.querySelector('input'));
    if (option2 == 'engraving') {
      var engraving_input_length = 0;
      for (var i = 0; i < this.engravingInput.length; i++) {
        var engraving_input = this.engravingInput[i];
        engraving_input_length += engraving_input.value.length;
      }

      if (engraving_input_length) {
        document.querySelector('[engravings="1"]').checked = true;
      }
      else {
        document.querySelector('[engravings="0"]').checked = true;
      }

      this.currentVariant = this.getVariantByOptionValues();
      this.currentVariantID = this.currentVariant.id;
      this.getEngravingVariant();
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.updateShareUrl();
    }
  }

  removeShowTooltip(input) {
    let engravingInputWrap = input.parentNode;
    if (engravingInputWrap.classList.contains('input-error') && input.value)
    {
      engravingInputWrap.classList.remove('input-error');
      var tooltip = engravingInputWrap.querySelector('.required-input-tooltip');
      engravingInputWrap.removeChild(tooltip);
    }
  }

  // required engraving value duplicated into popup input to pass it to Cart
  passEngravingValueIntoPopupInput(input) {
    let form = document.getElementById(`product-form-${this.dataset.section}`);
    let inputNameAttr = input.getAttribute('name'),
        popupInput = form.querySelector('[name="' + inputNameAttr + '"]');

    popupInput.value = input.value;
  }
}

customElements.define('engraving-input', EngravingInput);
