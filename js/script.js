const navbar = document.querySelector(".navbar");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-links a");

const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");

function handleNavbar() {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
}

window.addEventListener("scroll", handleNavbar);
handleNavbar();

menuButton.addEventListener("click", () => {
  menuButton.classList.toggle("open");
  navLinks.classList.toggle("open");
  document.body.classList.toggle("menu-open");
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuButton.classList.remove("open");
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
  });
});

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
  }
);

revealElements.forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 0.04, 0.3)}s`;
  revealObserver.observe(element);
});

if (window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("mousemove", (event) => {
    cursorDot.style.left = `${event.clientX}px`;
    cursorDot.style.top = `${event.clientY}px`;

    cursorRing.animate(
      {
        left: `${event.clientX}px`,
        top: `${event.clientY}px`,
      },
      {
        duration: 450,
        fill: "forwards",
        easing: "ease-out",
      }
    );
  });

  const hoverElements = document.querySelectorAll(
    "a, button, .project-card, .about-image"
  );

  hoverElements.forEach((element) => {
    element.addEventListener("mouseenter", () => {
      cursorRing.classList.add("hover");
    });

    element.addEventListener("mouseleave", () => {
      cursorRing.classList.remove("hover");
    });
  });
}

document.querySelectorAll(".project-card").forEach((card) => {
  card.addEventListener("mousemove", (event) => {
    if (window.innerWidth <= 800) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rotateX = (y / rect.height - 0.5) * -2;
    const rotateY = (x / rect.width - 0.5) * 2;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
  });
});