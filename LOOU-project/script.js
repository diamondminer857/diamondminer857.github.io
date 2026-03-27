document.addEventListener('DOMContentLoaded', function() {
  // Hamburger menu toggle
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger) {
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('open');
    });
  }

  // Dropdown toggle on mobile
  const dropdowns = document.querySelectorAll('.nav-dropdown > a');
  dropdowns.forEach(function(link) {
    link.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  // Close mobile menu on link click
  const allLinks = document.querySelectorAll('.nav-links a:not(.nav-dropdown > a)');
  allLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        navLinks.classList.remove('open');
      }
    });
  });

  // Mark active page in navigation
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navAnchors = document.querySelectorAll('.nav-links a');
  navAnchors.forEach(function(a) {
    const href = a.getAttribute('href');
    if (href === currentPage) {
      a.classList.add('active');
      // If it's inside a dropdown, also mark parent
      var dropdown = a.closest('.nav-dropdown');
      if (dropdown) {
        dropdown.querySelector(':scope > a').classList.add('active');
      }
    }
  });
});
