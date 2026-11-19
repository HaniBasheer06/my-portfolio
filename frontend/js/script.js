const navbar = document.querySelector(".navbar");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-links a");

const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");

const heroArticle = document.querySelector(".hero-article");
const heroRole = document.querySelector(".hero-role");
const roles = [
  "AI enthusiast",
  "Java developer",
  "Machine Learning learner",
  "Cybersecurity explorer",
];

if (heroRole && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let roleIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  heroRole.textContent = "";

  function animateRole() {
    const role = roles[roleIndex];
    characterIndex += deleting ? -1 : 1;
    heroRole.textContent = role.slice(0, characterIndex);

    if (!deleting && characterIndex === role.length) {
      deleting = true;
      setTimeout(animateRole, 1500);
    } else if (deleting && characterIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      heroArticle.textContent = roles[roleIndex].startsWith("AI") ? "an " : "a ";
      setTimeout(animateRole, 300);
    } else {
      setTimeout(animateRole, deleting ? 40 : 80);
    }
  }

  setTimeout(animateRole, 80);
}

function handleNavbar() {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
}

window.addEventListener("scroll", handleNavbar);
handleNavbar();

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.classList.toggle("open");
  navLinks.classList.toggle("open");
  document.body.classList.toggle("menu-open");

  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuButton.classList.remove("open");
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
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

const projectList = document.querySelector("#project-list");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

function createProjectCard(project, index, projectCount) {
  const card = document.createElement("article");
  card.className = "project-card reveal";

  const number = document.createElement("div");
  number.className = "project-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const info = document.createElement("div");
  info.className = "project-info";

  const category = document.createElement("p");
  category.className = "project-type";
  category.textContent = project.category;

  const title = document.createElement("h3");
  title.textContent = project.title;

  const description = document.createElement("p");
  description.textContent = project.description;

  const tags = document.createElement("div");
  tags.className = "tags";
  project.tags.forEach((tag) => {
    const tagElement = document.createElement("span");
    tagElement.textContent = tag;
    tags.append(tagElement);
  });
  info.append(category, title, description, tags);

  if (project.link) {
    const link = document.createElement("a");
    link.className = "project-link";
    link.href = project.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(document.createTextNode("View project "));
    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    link.append(arrow);
    info.append(link);
  }

  const image = document.createElement("div");
  image.className = project.image
    ? "project-image"
    : "project-image project-placeholder";
  if (project.image) {
    const imageElement = document.createElement("img");
    imageElement.src = project.image;
    imageElement.alt = project.image_alt;
    image.append(imageElement);
  } else {
    const placeholder = document.createElement("span");
    placeholder.textContent = `${String(index + 1).padStart(2, "0")} / ${String(
      projectCount
    ).padStart(2, "0")}`;
    image.append(placeholder);
  }

  card.append(number, info, image);
  card.addEventListener("mouseenter", () => cursorRing.classList.add("hover"));
  card.addEventListener("mouseleave", () => {
    cursorRing.classList.remove("hover");
    card.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
  });
  card.addEventListener("mousemove", (event) => {
    if (window.innerWidth <= 800) return;
    const rect = card.getBoundingClientRect();
    const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
    const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  return card;
}

async function loadProjects() {
  try {
    const response = await fetch("api/projects");
    if (response.ok) return await response.json();
  } catch (error) {
    console.warn("Projects API is unavailable; loading the static catalog.", error);
  }

  const response = await fetch("projects.json");
  if (!response.ok) {
    throw new Error(`Could not load the static project catalog (${response.status}).`);
  }
  return response.json();
}

loadProjects()
  .then((projects) => {
    projectList.replaceChildren();
    if (projects.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "project-status";
      emptyState.textContent = "Projects are coming soon.";
      projectList.append(emptyState);
      return;
    }

    projects.forEach((project, index) => {
      const card = createProjectCard(project, index, projects.length);
      card.style.transitionDelay = `${Math.min(index * 0.04, 0.3)}s`;
      projectList.append(card);
      revealObserver.observe(card);
    });
  })
  .catch((error) => {
    console.error("Could not load portfolio projects.", error);
    projectList.replaceChildren();
    const errorMessage = document.createElement("p");
    errorMessage.className = "project-status";
    errorMessage.textContent = "Projects could not be loaded. Please try again later.";
    projectList.append(errorMessage);
  });

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = contactForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  formStatus.textContent = "Sending your message...";

  try {
    const response = await fetch("https://hanibasheer06.pythonanywhere.com/api/contact",{ 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Your message could not be sent.");

    contactForm.reset();
    formStatus.textContent = result.message;
  } catch (error) {
    formStatus.textContent =
      error.message || "Your message could not be sent. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
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