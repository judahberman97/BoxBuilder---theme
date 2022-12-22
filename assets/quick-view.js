class QuickViewDrawer extends MenuDrawer {
  constructor() {
    super({
      classes: {
        open: 'quick-view--open',
        opening: 'quick-view--opening',
        closing: 'quick-view--closing'
      }
    });

    this.addEventListener('close', () => {
      const drawerContent = this.querySelector('.quick-view__content');
      drawerContent.innerHTML = '';
      drawerContent.classList.remove('hide-cover');
    });
  }
}
customElements.define('quick-view-drawer', QuickViewDrawer);

class QuickViewButton extends MenuDrawer {
  constructor() {
    super();

    this.addEventListener('click', () => {
      const wrapper = this.closest('.card-wrapper');
      const drawer = wrapper.querySelector('quick-view-drawer');
      if (drawer) {
        drawer.querySelector('summary').click();
      }
    });
  }
}
customElements.define('quick-view-button', QuickViewButton);

class QuickView extends HTMLElement {
  constructor() {
    super();

    new IntersectionObserver(this.handleIntersection.bind(this)).observe(this);
  }

  handleIntersection(entries, _observer) {
    if (!entries[0].isIntersecting) return;

    const drawerContent = this.querySelector('.quick-view__content');
    const productHandle = this.dataset.productHandle;
    let sectionUrl = `${routes.root_url}/products/${productHandle}?view=modal`;

    // remove double `/` in case shop might have /en or language in URL
    sectionUrl = sectionUrl.replace('//', '/');

    fetch(sectionUrl)
      .then(response => response.text())
      .then(html => {
        drawerContent.innerHTML = this.getSectionInnerHTML(html, '.quick-view__content');

        setTimeout(() => {
          drawerContent.classList.add('hide-cover');

          if (Shopify && Shopify.PaymentButton) {
            Shopify.PaymentButton.init();
          }
        }, 300);
      })
      .catch(e => {
        console.error(e);
      });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }
}
customElements.define('quick-view', QuickView);
