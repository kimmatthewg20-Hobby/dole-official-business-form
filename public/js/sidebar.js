// Sidebar functionality
function openNav() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.add("active");
  const mainElement = document.getElementById("main");
  if (mainElement) {
    mainElement.style.marginLeft = "250px";
  }
  // Also adjust main-container if it exists
  const mainContainer = document.querySelector(".main-container");
  if (mainContainer) {
    mainContainer.style.marginLeft = "250px";
  }
  
  // Ensure sidebar has higher z-index than hamburger menu
  sidebar.style.zIndex = "1100";
  
  // Make sure hamburger menu is visible but has lower z-index than sidebar
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  if (hamburgerMenu) {
    hamburgerMenu.style.zIndex = "1000";
    hamburgerMenu.style.visibility = "visible";
    hamburgerMenu.style.display = "block";
    hamburgerMenu.style.opacity = "1";
  }
  
  // Make sure all containers maintain center alignment and proper width
  const containers = document.querySelectorAll(".container");
  containers.forEach(container => {
    // Force center alignment
    container.style.marginLeft = "auto";
    container.style.marginRight = "auto";
    // Ensure width is maintained
    if (!container.dataset.originalWidth) {
      container.dataset.originalWidth = window.getComputedStyle(container).width;
    }
    container.style.width = container.dataset.originalWidth;
  });

  // Ensure proper header width
  const header = document.querySelector("header");
  if (header) {
    header.style.width = "100%";
  }

  // Fix header content alignment - specific for employees.html
  const headerContent = document.querySelector(".header-content");
  if (headerContent) {
    if (!headerContent.dataset.originalJustify) {
      headerContent.dataset.originalJustify = window.getComputedStyle(headerContent).justifyContent;
    }
    headerContent.style.justifyContent = "flex-start";
    headerContent.style.width = "100%";
    headerContent.style.position = "relative";
  }

  // Special fix for employees.html - ensure logo container stays in place
  const logoContainer = document.querySelector(".logo-container");
  if (logoContainer) {
    // Force stable positioning - prevent any shifting
    logoContainer.style.position = "relative";
    logoContainer.style.left = "0";
    logoContainer.style.transform = "none";
    logoContainer.style.marginLeft = "0";
    logoContainer.style.transition = "none";
    
    // Fix for the title not to wrap
    const title = logoContainer.querySelector("h1");
    if (title) {
      title.style.whiteSpace = "nowrap";
    }
  }
}

function closeNav() {
  document.getElementById("sidebar").classList.remove("active");
  const mainElement = document.getElementById("main");
  if (mainElement) {
    mainElement.style.marginLeft = "0";
  }
  // Also adjust main-container if it exists
  const mainContainer = document.querySelector(".main-container");
  if (mainContainer) {
    mainContainer.style.marginLeft = "0";
  }
  
  // Make sure all containers maintain center alignment and proper width
  const containers = document.querySelectorAll(".container");
  containers.forEach(container => {
    // Force center alignment
    container.style.marginLeft = "auto";
    container.style.marginRight = "auto";
    // Restore original width
    if (container.dataset.originalWidth) {
      container.style.width = container.dataset.originalWidth;
    }
  });

  // Ensure proper header width
  const header = document.querySelector("header");
  if (header) {
    header.style.width = "100%";
  }

  // Restore header content alignment
  const headerContent = document.querySelector(".header-content");
  if (headerContent && headerContent.dataset.originalJustify) {
    headerContent.style.justifyContent = headerContent.dataset.originalJustify;
    headerContent.style.width = "100%";
    headerContent.style.position = "relative";
  }

  // Special fix for employees.html - ensure logo container returns to original position
  const logoContainer = document.querySelector(".logo-container");
  if (logoContainer) {
    // Force stable positioning - prevent any shifting
    logoContainer.style.position = "relative";
    logoContainer.style.left = "0";
    logoContainer.style.transform = "none";
    logoContainer.style.marginLeft = "0";
    logoContainer.style.transition = "none";
    
    // Fix for the title not to wrap
    const title = logoContainer.querySelector("h1");
    if (title) {
      title.style.whiteSpace = "nowrap";
    }
  }
  
  // Ensure hamburger menu is fully visible
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  if (hamburgerMenu) {
    hamburgerMenu.style.visibility = "visible";
    hamburgerMenu.style.opacity = "1";
    hamburgerMenu.style.display = "block";
  }
}

// Add event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Set the z-index for hamburger menu and sidebar at load time
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.style.zIndex = "1100";
  }
  
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  if (hamburgerMenu) {
    hamburgerMenu.style.zIndex = "1000";
    hamburgerMenu.style.visibility = "visible";
    hamburgerMenu.style.display = "block";
    hamburgerMenu.style.opacity = "1";
  }

  // Store original container widths once at page load
  const containers = document.querySelectorAll(".container");
  containers.forEach(container => {
    container.dataset.originalWidth = window.getComputedStyle(container).width;
  });

  // Store original header content properties
  const headerContent = document.querySelector(".header-content");
  if (headerContent) {
    headerContent.dataset.originalJustify = window.getComputedStyle(headerContent).justifyContent;
  }

  // Add event listener for hamburger menu button
  if (hamburgerMenu) {
    // Remove any existing onclick attribute
    hamburgerMenu.removeAttribute('onclick');
    hamburgerMenu.addEventListener('click', openNav);
  }
  
  // Add event listener for close button
  const closeBtn = document.querySelector('.sidebar .close-btn');
  if (closeBtn) {
    // Remove any existing onclick attribute
    closeBtn.removeAttribute('onclick');
    closeBtn.addEventListener('click', closeNav);
  }
  
  // Fix for any page that might have had the sidebar open and was refreshed
  if (sidebar && sidebar.classList.contains("active")) {
    // Make sure containers are centered
    const containers = document.querySelectorAll(".container");
    containers.forEach(container => {
      container.style.marginLeft = "auto";
      container.style.marginRight = "auto";
      if (container.dataset.originalWidth) {
        container.style.width = container.dataset.originalWidth;
      }
    });
    
    // Ensure proper header width
    const header = document.querySelector("header");
    if (header) {
      header.style.width = "100%";
    }
    
    // Fix header content alignment
    if (headerContent) {
      headerContent.style.justifyContent = "flex-start";
      headerContent.style.width = "100%";
      headerContent.style.position = "relative";
    }
    
    // Fix logo container alignment
    const logoContainer = document.querySelector(".logo-container");
    if (logoContainer) {
      logoContainer.style.position = "relative";
      logoContainer.style.left = "0";
      logoContainer.style.transform = "none";
      logoContainer.style.marginLeft = "0";
      logoContainer.style.transition = "none";
      
      // Fix for the title not to wrap
      const title = logoContainer.querySelector("h1");
      if (title) {
        title.style.whiteSpace = "nowrap";
      }
    }
    
    // Make sure hamburger menu stays visible
    if (hamburgerMenu) {
      hamburgerMenu.style.zIndex = "1000";
      hamburgerMenu.style.visibility = "visible";
      hamburgerMenu.style.display = "block";
      hamburgerMenu.style.opacity = "1";
    }
  }
}); 