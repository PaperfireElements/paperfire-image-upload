// @ts-check
import * as firebase from 'firebase/app';
import 'firebase/storage';

class PaperfireImageUpload extends HTMLElement {
	constructor() {
		super();
		this.data = null;
		this.disabled;
		this.loading = false;
		this.metadata = {};
		this.progress = 0;
		this.ref = firebase.storage().ref();
		this.storageUrl = 'paperfire/images';
		this.task = null;
		this.type = 'file'; // file/blob/bytes : string/base64/base64url/data URL

		this.addEventListener('upload', (data, type, metadata) => {
			this.type = type;
			this.upload(data, metadata);
		});
		this.addEventListener('cancel', () => {
			if (!this.task) {
				return false;
			}
			return this.task.cancel();
		});
	}

	static get observedAttributes() {
		return ['disabled', 'data', 'metadata', 'storageUrl', 'type'];
	}

	get disabled() {
		return this.hasAttribute('disabled');
	}

	attributeChangedCallback(name, oldVal, newVal) {
		console.log('ATTRS_CHANGED', name, oldVal, newVal);
		this[name] = newVal || !!newVal;
		if (name === 'data' && !this.disabled) {
			this.upload(this.data, this.metadata);
		}
		if (this.disabled) {
			this.setAttribute('tabindex', '-1');
			this.setAttribute('aria-disabled', 'true');
		} else {
			this.setAttribute('tabindex', '0');
			this.setAttribute('aria-disabled', 'false');
		}
	}
	buildEvent(name, data) {
		return new CustomEvent(name, { detail: data });
	}
	error(err) {
		this.loading = false;
		this.dispatchEvent(this.buildEvent('error', err));
		this.setAttribute('error', '');
		this.removeAttribute('loading');
		this.task = null;
	}
	success() {
		this.loading = false;
		this.dispatchEvent(this.buildEvent('success', this.task.snapshot));
		this.setAttribute('success', '');
		this.removeAttribute('loading');
		this.task = null;
	}
	upload(data, metadata) {
		const ref = this.ref.child(this.storageUrl);
		const FORMAT = firebase.storage.StringFormat;
		if (!data) {
			return;
		}
		this.loading = true;
		this.setAttribute('loading', '');
		this.removeAttribute('success');
		this.removeAttribute('error');
		switch (this.type) {
			case FORMAT.RAW:
				this.task = ref.putString(data, FORMAT.RAW, metadata);
				break;
			case FORMAT.BASE64:
			case FORMAT.BASE64URL:
			case FORMAT.DATA_URL:
				this.task = ref.putString(data, this.type, metadata);
				break;
			default:
				this.task = ref.put(data, metadata);
				break;
		}

		this.task.on(firebase.storage.TaskEvent.STATE_CHANGED, this.watch, this.error, this.success);
	}
	watch(snapshot) {
		const STATE = firebase.storage.TaskState;
		this.loading = true;
		this.progress = snapshot.bytesTransferred / snapshot.totalBytes * 100;
		this.dispatchEvent(this.buildEvent('progress-changed', this.progress));
		this.dispatchEvent(this.buildEvent('state-changed', snapshot.state));
		this.setAttribute('state', snapshot.state);
	}
}

customElements.define('paperfire-image-upload', PaperfireImageUpload);
