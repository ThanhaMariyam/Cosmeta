
    document.addEventListener('DOMContentLoaded', () => {
      const pageTitle = document.title;
      const navLinks = document.querySelectorAll('.nav-link');
  
      navLinks.forEach(link => {
        if (link.getAttribute('data-title') === pageTitle) {
          link.classList.add('active');
        }
      });
    });
