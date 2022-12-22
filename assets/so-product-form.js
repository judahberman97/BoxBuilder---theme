if (!customElements.get('so-product-form')) {
  customElements.define('so-product-form', class SoProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      this.SoVariantRadios = document.querySelector('so-variant-radios');
      this.stickyBtn = document.querySelector('.product-form--sticky');
      this.stickyBtnWrapper = document.querySelector('.product-form--sticky-wrapper');
      this.form.querySelector('[name=id]').disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.formContainer = document.getElementById(`MainProduct-${this.dataset.section}-ProductFormAnchor`);
      this.submitButton = this.querySelector('[type="submit"]');
      this.submitButtonPopup = this.form.querySelector('.product-popup-modal__button');

      this.bindEvents();
    }

    // Check FIRST engraving field in Popup
    validateEngravingFields() {
      const engravingInputs = this.form.querySelectorAll('.so-engraving-input');
      let isEngravingInputEmpty = false;

      if(engravingInputs.length) {
        if (!engravingInputs[0].value) {
          isEngravingInputEmpty = true;
          this.showTooltip(engravingInputs[0].parentNode)
        }
      }

      return isEngravingInputEmpty
    }

    // Check required fields on PP before submit
    validateInputFields() {
      const engravingInputs = this.SoVariantRadios.querySelectorAll('.field__input[type="text"]');
      let isEngravingInputEmpty = false;

      if(engravingInputs.length) {
        for (var i = 0; i < engravingInputs.length; i++) {
        if (!engravingInputs[i].value && engravingInputs[i].hasAttribute('required')) {
          isEngravingInputEmpty = true;
          this.showTooltip(engravingInputs[i].parentNode)
        }
        }
      }

      return isEngravingInputEmpty
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

    onSubmitHandler(evt) {
      evt.preventDefault();
      if (this.submitButtonPopup.getAttribute('data-upsell-type-popup') == 'engraving') {
        if (this.validateEngravingFields() && evt.submitter) {
          return
        }
      }
      else {
        if (this.validateInputFields()) return
      }
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

      this.handleErrorMessage();

      this.submitButton.setAttribute('aria-disabled', true);
      this.submitButton.classList.add('loading');
      this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

      const config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      const formData = new FormData(this.form);
      formData.append('sections_url', window.location.pathname);
      config.body = formData;

      fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            this.handleErrorMessage(response.description);

            const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
            if (!soldOutMessage) return;
            this.submitButton.setAttribute('aria-disabled', true);
            this.submitButton.querySelector('span').classList.add('hidden');
            soldOutMessage.classList.remove('hidden');
            this.error = true;
            return;
          }

          this.error = false;
          document.location.href = '/cart?view=shineon';
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          this.submitButton.classList.remove('loading');
          if (!this.error) this.submitButton.removeAttribute('aria-disabled');
          this.querySelector('.loading-overlay__spinner').classList.add('hidden');
        });
    }

    /**
     * @param {IntersectionObserverEntry[]} entries
     * @param {IntersectionObserver} observer
     */
    onFormVisibilityChange([entry], observer) {
      if (!this.form) return;

      console.log(entry.isIntersecting)

      if (entry.isIntersecting) {
        this.stickyBtnWrapper.classList.toggle('product-form--sticky', (window.innerHeight + window.scrollY) - this.stickyBtnWrapper.clientHeight > this.stickyBtnWrapper.offsetTop);
      }
    }

    handleErrorMessage(errorMessage = false) {
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }

    bindEvents() {
      if (this.formContainer) {
        const CLASS_PRODUCT_FORM_STICKY = 'product-form--sticky';

        document.addEventListener('scroll', () => {
          if (screen.width > 749) {
            return this.stickyBtnWrapper.classList.remove(CLASS_PRODUCT_FORM_STICKY);
          }

          this.stickyBtnWrapper.classList.toggle(CLASS_PRODUCT_FORM_STICKY, (window.innerHeight + window.scrollY) - this.stickyBtnWrapper.clientHeight > this.stickyBtnWrapper.offsetTop);
        });
      }
    }
  });
}
