if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
          thumbnailMedia: this.querySelectorAll('[id^="GalleryThumbnails"] ul li'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();

        //click variant image
        this.elements.thumbnailMedia.forEach((thumbnail)=>{
          // thumbnail.addEventListener('change', this.onVariantChange);
          thumbnail.addEventListener('click',(item)=>{
            console.log(item);
            console.log(item.dataset.mediaValue);
            console.log(this.getVariantData());
          });
        })
      }

      onSlideChanged(event) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia.classList.add('is-active');

        if (prepend) {
          activeMedia.parentElement.prepend(activeMedia);
          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.prepend(activeThumbnail);
          }
          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          if (!this.elements.thumbnails || this.dataset.desktopLayout === 'stacked') {
            activeMedia.scrollIntoView({ behavior: 'smooth' });
          }
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }

      // update variant

      onVariantChange() {
        this.updateOptions();
        this.updateMasterId();
        this.toggleAddButton(true, '', false);
        this.updatePickupAvailability();
        this.removeErrorMessage();
        this.updateVariantStatuses();
    
        if (!this.currentVariant) {
          this.toggleAddButton(true, '', true);
          this.setUnavailable();
        } else {
          this.updateMedia();
          this.updateURL();
          this.updateVariantInput();
          this.renderProductInfo();
          this.updateShareUrl();
        }
      }
    
      updateOptions() {
        
        this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
        console.log(this.options);
      }
    
      updateMasterId() {
        console.log(this.getVariantData());
        this.currentVariant = this.getVariantData().find((variant) => {
          console.log(variant.options);
          return !variant.options
            .map((option, index) => {
              console.log(option, index);
              return this.options[index] === option;
            })
            .includes(false);
        });
      }
    
      updateMedia() {
        if (!this.currentVariant) return;
        if (!this.currentVariant.featured_media) return;
    
        const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
        mediaGalleries.forEach((mediaGallery) =>
          mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true)
        );
    
        const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
        if (!modalContent) return;
        const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
        modalContent.prepend(newMediaModal);
      }
    
      updateURL() {
        if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
        window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
      }
    
      updateShareUrl() {
        const shareButton = document.getElementById(`Share-${this.dataset.section}`);
        if (!shareButton || !shareButton.updateUrl) return;
        shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
      }
    
      updateVariantInput() {
        const productForms = document.querySelectorAll(
          `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
        );
        productForms.forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          input.value = this.currentVariant.id;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
    
      updateVariantStatuses() {
        const selectedOptionOneVariants = this.variantData.filter(
          (variant) => this.querySelector(':checked').value === variant.option1
        );
        const inputWrappers = [...this.querySelectorAll('.product-form__input')];
        inputWrappers.forEach((option, index) => {
          if (index === 0) return;
          const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
          const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
          const availableOptionInputsValue = selectedOptionOneVariants
            .filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected)
            .map((variantOption) => variantOption[`option${index + 1}`]);
          this.setInputAvailability(optionInputs, availableOptionInputsValue);
        });
      }
    
      setInputAvailability(listOfOptions, listOfAvailableOptions) {
        listOfOptions.forEach((input) => {
          if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
            input.innerText = input.getAttribute('value');
          } else {
            input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
          }
        });
      }
    
      updatePickupAvailability() {
        const pickUpAvailability = document.querySelector('pickup-availability');
        if (!pickUpAvailability) return;
    
        if (this.currentVariant && this.currentVariant.available) {
          pickUpAvailability.fetchAvailability(this.currentVariant.id);
        } else {
          pickUpAvailability.removeAttribute('available');
          pickUpAvailability.innerHTML = '';
        }
      }
    
      removeErrorMessage() {
        const section = this.closest('section');
        if (!section) return;
    
        const productForm = section.querySelector('product-form');
        if (productForm) productForm.handleErrorMessage();
      }
    
      renderProductInfo() {
        const requestedVariantId = this.currentVariant.id;
        const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
    
        fetch(
          `${this.dataset.url}?variant=${requestedVariantId}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
          }`
        )
          .then((response) => response.text())
          .then((responseText) => {
            // prevent unnecessary ui changes from abandoned selections
            if (this.currentVariant.id !== requestedVariantId) return;
    
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const destination = document.getElementById(`price-${this.dataset.section}`);
            const source = html.getElementById(
              `price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
            );
            const skuSource = html.getElementById(
              `Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
            );
            const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
            const inventorySource = html.getElementById(
              `Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
            );
            const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);
    
            const volumePricingSource = html.getElementById(
              `Volume-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
            );
    
            const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
            const pricePerItemSource = html.getElementById(`Price-Per-Item-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
    
            const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);
            const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);
            const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);
    
            if (volumeNote) volumeNote.classList.remove('hidden');
            if (volumePricingDestination) volumePricingDestination.classList.remove('hidden');
            if (qtyRules) qtyRules.classList.remove('hidden');
    
            if (source && destination) destination.innerHTML = source.innerHTML;
            if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
            if (skuSource && skuDestination) {
              skuDestination.innerHTML = skuSource.innerHTML;
              skuDestination.classList.toggle('hidden', skuSource.classList.contains('hidden'));
            }
    
            if (volumePricingSource && volumePricingDestination) {
              volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
            }
    
            if (pricePerItemSource && pricePerItemDestination) {
              pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
              pricePerItemDestination.classList.toggle('hidden', pricePerItemSource.classList.contains('hidden'));
            }
    
            const price = document.getElementById(`price-${this.dataset.section}`);
    
            if (price) price.classList.remove('hidden');
    
            if (inventoryDestination)
              inventoryDestination.classList.toggle('hidden', inventorySource.innerText === '');
    
            const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);
            this.toggleAddButton(
              addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') : true,
              window.variantStrings.soldOut
            );
    
            publish(PUB_SUB_EVENTS.variantChange, {
              data: {
                sectionId,
                html,
                variant: this.currentVariant,
              },
            });
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
    
      setUnavailable() {
        const button = document.getElementById(`product-form-${this.dataset.section}`);
        const addButton = button.querySelector('[name="add"]');
        const addButtonText = button.querySelector('[name="add"] > span');
        const price = document.getElementById(`price-${this.dataset.section}`);
        const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
        const sku = document.getElementById(`Sku-${this.dataset.section}`);
        const pricePerItem = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);
        const volumeTable = document.getElementById(`Volume-${this.dataset.section}`);
        const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);
    
        if (!addButton) return;
        addButtonText.textContent = window.variantStrings.unavailable;
        if (price) price.classList.add('hidden');
        if (inventory) inventory.classList.add('hidden');
        if (sku) sku.classList.add('hidden');
        if (pricePerItem) pricePerItem.classList.add('hidden');
        if (volumeNote) volumeNote.classList.add('hidden');
        if (volumeTable) volumeTable.classList.add('hidden');
        if (qtyRules) qtyRules.classList.add('hidden');
      }
    
      getVariantData() {
        this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
        return this.variantData;
      }







      
    }
  );
}
