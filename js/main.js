'use strict';

// ContactHub - CRUD, search, validation and localStorage
const $ = (selector) => document.querySelector(selector);
const contactModal = $('#contactModal');
const contactForm = $('#contactForm');
const modalTitle = $('#modalTitle');
const submitModalBtn = $('#submitModalBtn');
const avatarPreview = $('#avatarPreview');
const avatarInput = $('#avatarInput');
const searchInput = $('#searchInput');
const contactCardContainer = $('#contactCardContainer');

const fields = {
  name: $('#contactName'),
  phone: $('#contactPhone'),
  email: $('#contactEmail'),
  address: $('#contactAddress'),
  group: $('#contactGroup'),
  notes: $('#contactNotes'),
  favorite: $('#contactFavorite'),
  emergency: $('#contactEmergency'),
  avatarPath: $('#avatarPath'),
  id: $('#contactId')
};

const STORAGE_KEY = 'contactHubContacts';
let contacts = loadContacts();
let currentAvatar = '';
let editingId = null;

function loadContacts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error('Could not read saved contacts:', error);
    return [];
  }
}

function saveContacts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch (error) {
    notify('Storage full', 'The contact could not be saved. Try using a smaller photo.', 'error');
  }
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || '?';
}

function avatarMarkup(contact, extraClass = 'contact-card-avatar') {
  if (contact.avatar) {
    return `<img src="${escapeHTML(contact.avatar)}" alt="${escapeHTML(contact.name)}" class="${extraClass} object-fit-cover">`;
  }
  return `<div class="${extraClass} d-flex align-items-center justify-content-center text-white fw-semibold" style="background:linear-gradient(135deg,#06b6d4,#2563eb)">${escapeHTML(initials(contact.name))}</div>`;
}

function notify(title, text = '', icon = 'success') {
  if (window.Swal) {
    return Swal.fire({ title, text, icon, confirmButtonColor: '#7c3aed', customClass: { container: 'swal-container' } });
  }
  window.alert(text ? `${title}\n${text}` : title);
  return Promise.resolve();
}

function confirmAction(title, text) {
  if (window.Swal) {
    return Swal.fire({
      title, text, icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Yes, delete it', cancelButtonText: 'Cancel',
      confirmButtonColor: '#e11d48', cancelButtonColor: '#6b7280',
      customClass: { container: 'swal-container' }
    }).then(result => result.isConfirmed);
  }
  return Promise.resolve(window.confirm(`${title}\n${text}`));
}

function getFilteredContacts() {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) return contacts;
  return contacts.filter(contact => [contact.name, contact.phone, contact.email]
    .some(value => String(value || '').toLowerCase().includes(term)));
}

function renderContacts() {
  const visibleContacts = getFilteredContacts();
  $('#totalContacts').textContent = contacts.length;
  $('#totalContactsSpan').textContent = contacts.length;
  $('#totalFavContacts').textContent = contacts.filter(contact => contact.favorite).length;
  $('#totalEmergencyContacts').textContent = contacts.filter(contact => contact.emergency).length;

  if (!visibleContacts.length) {
    const isSearching = searchInput.value.trim().length > 0;
    contactCardContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="d-flex align-items-center justify-content-center mx-auto mb-4 bg-secondary-subtle rounded-4" style="width:80px;height:80px">
          <i class="fas fa-address-book text-secondary fs-4"></i>
        </div>
        <p class="text-muted fw-semibold mb-1">${isSearching ? 'No contacts found' : 'No contacts yet'}</p>
        <p class="text-secondary small">${isSearching ? 'Try another name, phone number, or email.' : 'Click “Add Contact” to get started.'}</p>
      </div>`;
  } else {
    contactCardContainer.innerHTML = visibleContacts.map(contact => contactCardTemplate(contact)).join('');
  }

  renderSidebar('favorite');
  renderSidebar('emergency');
}

function contactCardTemplate(contact) {
  const group = contact.group ? `<span class="contact-tag d-inline-flex align-items-center" style="background:#dcfce7;color:#15803d">${escapeHTML(contact.group)}</span>` : '';
  const emergencyTag = contact.emergency ? '<span class="contact-emergency ms-1">Emergency</span>' : '';
  const favoriteBadge = contact.favorite ? '<div class="badge-icon badge-star d-flex justify-content-center align-items-center rounded-circle"><i class="fas fa-star"></i></div>' : '';
  const emergencyBadge = contact.emergency ? '<div class="badge-icon badge-heart d-flex justify-content-center align-items-center rounded-circle"><i class="fas fa-heart-pulse"></i></div>' : '';
  const emailRow = contact.email ? `<div class="contact-detail-item"><div class="contact-detail-icon-container d-flex align-items-center justify-content-center violet"><i class="contact-detail-icon violet fas fa-envelope"></i></div><span class="contact-detail-text" title="${escapeHTML(contact.email)}">${escapeHTML(contact.email)}</span></div>` : '';
  const addressRow = contact.address ? `<div class="contact-detail-item"><div class="contact-detail-icon-container d-flex align-items-center justify-content-center emerald"><i class="contact-detail-icon emerald fas fa-location-dot"></i></div><span class="contact-detail-text" title="${escapeHTML(contact.address)}">${escapeHTML(contact.address)}</span></div>` : '';
  const notes = contact.notes ? `<p class="small text-muted mt-2 mb-0">${escapeHTML(contact.notes)}</p>` : '';
  return `
    <div class="col-md-6 col-lg-12 col-xl-6 mb-4">
      <article class="contact-card">
        <div class="contact-card-header">
          <div class="d-flex align-items-start gap-3">
            <div class="position-relative flex-shrink-0">${avatarMarkup(contact)}${favoriteBadge}${emergencyBadge}</div>
            <div class="flex-grow-1 min-w-0 pt-1">
              <h3 class="contact-card-name m-0" title="${escapeHTML(contact.name)}">${escapeHTML(contact.name)}</h3>
              <div class="d-flex align-items-center gap-2 mt-1">
                <div class="contact-card-phone-container"><i class="contact-card-phone-icon fas fa-phone"></i></div>
                <span class="contact-card-phone">${escapeHTML(contact.phone)}</span>
              </div>
            </div>
          </div>
          <div class="contact-details">${emailRow}${addressRow}</div>
          ${(group || emergencyTag) ? `<div class="contact-tags">${group}${emergencyTag}</div>` : ''}
          ${notes}
        </div>
        <div class="contact-card-actions">
          <div class="action-buttons-left">
            <a href="tel:${escapeHTML(contact.phone)}" class="action-button call" title="Call ${escapeHTML(contact.name)}" aria-label="Call contact"><i class="fas fa-phone"></i></a>
            ${contact.email ? `<a href="mailto:${escapeHTML(contact.email)}" class="action-button email" title="Email ${escapeHTML(contact.name)}" aria-label="Email contact"><i class="fas fa-envelope"></i></a>` : ''}
          </div>
          <div class="action-buttons-right">
            <button class="action-button favorite ${contact.favorite ? 'text-warning' : ''}" data-action="favorite" data-id="${contact.id}" title="Toggle favorite" aria-label="Toggle favorite"><i class="fas fa-star"></i></button>
            <button class="action-button emergency ${contact.emergency ? 'text-danger' : ''}" data-action="emergency" data-id="${contact.id}" title="Toggle emergency" aria-label="Toggle emergency"><i class="fas fa-heart-pulse"></i></button>
            <button class="action-button edit" data-action="edit" data-id="${contact.id}" title="Edit contact" aria-label="Edit contact"><i class="fas fa-pen"></i></button>
            <button class="action-button delete" data-action="delete" data-id="${contact.id}" title="Delete contact" aria-label="Delete contact"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </article>
    </div>`;
}

function renderSidebar(type) {
  const isFavorite = type === 'favorite';
  const list = contacts.filter(contact => isFavorite ? contact.favorite : contact.emergency);
  const container = $(isFavorite ? '#bigFavItem' : '#bigEmergencyItem');
  const emptyText = isFavorite ? 'No favorites yet' : 'No emergency contacts';
  const itemClass = isFavorite ? 'contact-item' : 'contact-item-emergency';
  const callClass = isFavorite ? 'call-btn' : 'call-btn-emergency call-btn-rose';
  container.innerHTML = list.length ? list.map(contact => `
    <div class="col-12">
      <div class="${itemClass} d-flex justify-content-between align-items-center gap-3 p-2 rounded-3 mb-2">
        <div class="flex-shrink-0">${avatarMarkup(contact, 'contact-avatar')}</div>
        <div class="flex-grow-1 text-truncate">
          <h4 class="mb-0 fw-medium text-dark small text-truncate">${escapeHTML(contact.name)}</h4>
          <p class="mb-0 text-muted small text-truncate">${escapeHTML(contact.phone)}</p>
        </div>
        <a href="tel:${escapeHTML(contact.phone)}" class="${callClass} d-flex align-items-center justify-content-center flex-shrink-0" aria-label="Call ${escapeHTML(contact.name)}"><i class="fas fa-phone"></i></a>
      </div>
    </div>`).join('') : `<div class="col-12"><div class="empty-state"><p class="text-muted mb-0">${emptyText}</p></div></div>`;
}

function clearErrors() {
  ['contactName', 'contactPhone', 'contactEmail'].forEach(id => {
    const input = $(`#${id}`);
    const error = $(`#${id}Error`);
    input.classList.remove('is-invalid');
    error.classList.add('d-none');
  });
}

function showError(field, message) {
  field.classList.add('is-invalid');
  const error = $(`#${field.id}Error`);
  if (error) {
    if (message) error.textContent = message;
    error.classList.remove('d-none');
  }
}

function validateForm() {
  clearErrors();
  let valid = true;
  const name = fields.name.value.trim();
  const phone = fields.phone.value.trim();
  const email = fields.email.value.trim();
  const namePattern = /^[\p{L}][\p{L}\s.'-]{1,49}$/u;
  const phonePattern = /^(?:\+20|0020|0)?1[0125]\d{8}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!namePattern.test(name)) {
    showError(fields.name, 'Name should contain only letters and spaces (2-50 characters).');
    valid = false;
  }
  if (!phonePattern.test(phone.replace(/[\s()-]/g, ''))) {
    showError(fields.phone, 'Please enter a valid Egyptian phone number.');
    valid = false;
  }
  if (email && !emailPattern.test(email)) {
    showError(fields.email, 'Please enter a valid email address.');
    valid = false;
  }

  const duplicatePhone = contacts.some(contact => contact.phone.replace(/[\s()-]/g, '') === phone.replace(/[\s()-]/g, '') && contact.id !== editingId);
  if (duplicatePhone) {
    showError(fields.phone, 'This phone number is already saved.');
    valid = false;
  }
  if (email) {
    const duplicateEmail = contacts.some(contact => contact.email.toLowerCase() === email.toLowerCase() && contact.id !== editingId);
    if (duplicateEmail) {
      showError(fields.email, 'This email address is already saved.');
      valid = false;
    }
  }
  return valid;
}

function openModal(contact = null) {
  contactForm.reset();
  clearErrors();
  editingId = contact ? contact.id : null;
  currentAvatar = contact?.avatar || '';
  fields.avatarPath.value = currentAvatar;
  fields.id.value = contact?.id || '';
  modalTitle.textContent = contact ? 'Edit Contact' : 'Add New Contact';
  submitModalBtn.innerHTML = `<i class="fas fa-check me-2"></i>${contact ? 'Update Contact' : 'Save Contact'}`;

  if (contact) {
    fields.name.value = contact.name || '';
    fields.phone.value = contact.phone || '';
    fields.email.value = contact.email || '';
    fields.address.value = contact.address || '';
    fields.group.value = contact.group || '';
    fields.notes.value = contact.notes || '';
    fields.favorite.checked = Boolean(contact.favorite);
    fields.emergency.checked = Boolean(contact.emergency);
  }
  updateAvatarPreview(contact?.name || '');
  contactModal.classList.remove('d-none');
  contactModal.classList.add('d-flex');
  document.body.style.overflow = 'hidden';
  fields.name.focus();
}

function closeModal() {
  contactModal.classList.add('d-none');
  contactModal.classList.remove('d-flex');
  document.body.style.overflow = '';
  contactForm.reset();
  clearErrors();
  editingId = null;
  currentAvatar = '';
  fields.avatarPath.value = '';
  updateAvatarPreview('');
}

function updateAvatarPreview(name = fields.name.value) {
  if (currentAvatar) {
    avatarPreview.innerHTML = `<img src="${escapeHTML(currentAvatar)}" alt="Contact photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    avatarPreview.innerHTML = `<span>${escapeHTML(initials(name) === '?' ? '' : initials(name))}</span><i class="fas fa-user" style="${name.trim() ? 'display:none' : ''}"></i>`;
  }
}

function saveContact() {
  if (!validateForm()) {
    const firstInvalid = contactForm.querySelector('.is-invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const wasEditing = Boolean(editingId);
  const contact = {
    id: editingId || (window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: fields.name.value.trim(),
    phone: fields.phone.value.trim(),
    email: fields.email.value.trim(),
    address: fields.address.value.trim(),
    group: fields.group.value,
    notes: fields.notes.value.trim(),
    favorite: fields.favorite.checked,
    emergency: fields.emergency.checked,
    avatar: currentAvatar
  };

  if (editingId) {
    contacts = contacts.map(item => item.id === editingId ? contact : item);
  } else {
    contacts.unshift(contact);
  }
  saveContacts();
  renderContacts();
  closeModal();
  notify(wasEditing ? 'Contact updated!' : 'Contact added!', `${contact.name} has been ${wasEditing ? 'updated' : 'saved'} successfully.`);
}

function deleteContact(id) {
  const contact = contacts.find(item => item.id === id);
  if (!contact) return;
  confirmAction('Delete contact?', `Are you sure you want to delete ${contact.name}? This cannot be undone.`).then(confirmed => {
    if (!confirmed) return;
    contacts = contacts.filter(item => item.id !== id);
    saveContacts();
    renderContacts();
    notify('Contact deleted', `${contact.name} was removed.`);
  });
}

$('#addContactBtn').addEventListener('click', () => openModal());
$('#closeModalBtn').addEventListener('click', closeModal);
$('#cancelModalBtn').addEventListener('click', closeModal);
submitModalBtn.addEventListener('click', saveContact);
contactForm.addEventListener('submit', event => { event.preventDefault(); saveContact(); });
searchInput.addEventListener('input', renderContacts);

contactCardContainer.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  const contact = contacts.find(item => item.id === id);
  if (!contact) return;

  switch (button.dataset.action) {
    case 'edit': openModal(contact); break;
    case 'delete': deleteContact(id); break;
    case 'favorite':
      contact.favorite = !contact.favorite;
      saveContacts(); renderContacts();
      notify(contact.favorite ? 'Added to favorites' : 'Removed from favorites', contact.name);
      break;
    case 'emergency':
      contact.emergency = !contact.emergency;
      saveContacts(); renderContacts();
      notify(contact.emergency ? 'Marked as emergency' : 'Removed from emergency', contact.name);
      break;
  }
});

avatarInput.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    notify('Invalid file', 'Please choose an image file.', 'error');
    avatarInput.value = '';
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    notify('Image too large', 'Please choose an image smaller than 1.5 MB.', 'warning');
    avatarInput.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    currentAvatar = String(reader.result || '');
    fields.avatarPath.value = currentAvatar;
    updateAvatarPreview();
  };
  reader.readAsDataURL(file);
});

fields.name.addEventListener('input', () => {
  if (!currentAvatar) updateAvatarPreview();
  if (fields.name.classList.contains('is-invalid')) clearErrors();
});
[fields.phone, fields.email].forEach(field => field.addEventListener('input', () => {
  field.classList.remove('is-invalid');
  $(`#${field.id}Error`).classList.add('d-none');
}));

contactModal.addEventListener('click', event => {
  if (event.target === contactModal) closeModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !contactModal.classList.contains('d-none')) closeModal();
});

renderContacts();
