/**
 * CONVOI VERS LE PETIT PARADIS — CORA EVENTS
 * Script d'interaction & réservation officiel
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. CONFIGURATION DU PRIX ET DES ÉLÉMENTS ---
    const PRIX_UNITAIRE = 3000;
    let quantite = 1;

    const champNom = document.getElementById("nom");
    const champEmail = document.getElementById("email");
    const champTelephone = document.getElementById("telephone");
    const champCommune = document.getElementById("commune");
    const champQuantite = document.getElementById("quantite");
    const btnMinus = document.getElementById("btnMinus");
    const btnPlus = document.getElementById("btnPlus");
    const affichageTotal = document.getElementById("total");
    const resumeDetail = document.getElementById("summaryDetail");
    const formulaire = document.getElementById("reservationForm");
    const btnSubmit = document.getElementById("btnSubmit");

    // Toast
    const toast = document.getElementById("toastNotice");
    const toastMsg = document.getElementById("toastMsg");
    const toastIcon = document.getElementById("toastIcon");

    function afficherToast(message, type = "info") {
        if (!toast || !toastMsg) return;
        toastMsg.textContent = message;
        toastIcon.textContent = type === "error" ? "⚠️" : (type === "success" ? "✅" : "ℹ️");
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 4000);
    }

    // --- 2. CALCUL DU TOTAL ---
    function recalculerPrix() {
        const total = quantite * PRIX_UNITAIRE;
        if (affichageTotal) {
            affichageTotal.textContent = `${total.toLocaleString("fr-FR")} FCFA`;
        }
        if (resumeDetail) {
            const passagerLabel = quantite > 1 ? "passagers" : "passager";
            resumeDetail.textContent = `${quantite} ${passagerLabel} × ${PRIX_UNITAIRE.toLocaleString("fr-FR")} FCFA`;
        }
    }

    if (btnMinus && btnPlus && champQuantite) {
        btnMinus.addEventListener("click", () => {
            if (quantite > 1) {
                quantite--;
                champQuantite.value = quantite;
                recalculerPrix();
            }
        });

        btnPlus.addEventListener("click", () => {
            if (quantite < 10) {
                quantite++;
                champQuantite.value = quantite;
                recalculerPrix();
            } else {
                afficherToast("Pour plus de 10 personnes, contactez directement l'organisation.", "info");
            }
        });
    }

    // Initialiser le prix
    recalculerPrix();

    // --- 3. COMPTE À REBOURS VIVANT (13 DÉCEMBRE 2026 À 09H00 GMT) ---
    const dateCible = new Date("2026-12-13T09:00:00Z").getTime();

    function actualiserCompteARebours() {
        const maintenant = new Date().getTime();
        const difference = dateCible - maintenant;

        const elDays = document.getElementById("cdDays");
        const elHours = document.getElementById("cdHours");
        const elMinutes = document.getElementById("cdMinutes");
        const elSeconds = document.getElementById("cdSeconds");

        if (difference <= 0) {
            if (elDays) elDays.textContent = "00";
            if (elHours) elHours.textContent = "00";
            if (elMinutes) elMinutes.textContent = "00";
            if (elSeconds) elSeconds.textContent = "00";
            return;
        }

        const jours = Math.floor(difference / (1000 * 60 * 60 * 24));
        const heures = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const secondes = Math.floor((difference % (1000 * 60)) / 1000);

        if (elDays) elDays.textContent = String(jours).padStart(2, "0");
        if (elHours) elHours.textContent = String(heures).padStart(2, "0");
        if (elMinutes) elMinutes.textContent = String(minutes).padStart(2, "0");
        if (elSeconds) elSeconds.textContent = String(secondes).padStart(2, "0");
    }

    actualiserCompteARebours();
    setInterval(actualiserCompteARebours, 1000);

    // --- 4. ACCORDÉONS FAQ ---
    const faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach((item) => {
        const trigger = item.querySelector(".faq-trigger");
        if (trigger) {
            trigger.addEventListener("click", () => {
                const isActive = item.classList.contains("active");
                faqItems.forEach((other) => other.classList.remove("active"));
                if (!isActive) {
                    item.classList.add("active");
                }
            });
        }
    });

    // --- 5. POINTS DE RASSEMBLEMENT PAR COMMUNE ---
    const POINTS_RASSEMBLEMENT = {
        "Anyama": {
            lieu: "Gare d'Anyama",
            desc: "Rassemblement à la Gare d'Anyama"
        },
        "Bingerville": {
            lieu: "Feu de Khesse",
            desc: "Rendez-vous au Feu de Khesse de Bingerville"
        },
        "Cocody": {
            lieu: "Université Félix Houphouët-Boigny (UFHB)",
            desc: "Rassemblement à l'entrée principale de l'UFHB"
        },
        "Marcory": {
            lieu: "Gare de Bassam",
            desc: "Point de regroupement à la Gare de Bassam"
        },
        "Treichville": {
            lieu: "Gare de Bassam",
            desc: "Point de regroupement à la Gare de Bassam"
        },
        "Koumassi": {
            lieu: "Grand Carrefour de Koumassi",
            desc: "Rassemblement au Grand Carrefour de Koumassi"
        },
        "Port-Bouët": {
            lieu: "Grand Carrefour de Koumassi",
            desc: "Rassemblement au Grand Carrefour de Koumassi"
        },
        "Gonzagueville": {
            lieu: "Grand Carrefour de Koumassi",
            desc: "Rassemblement au Grand Carrefour de Koumassi"
        },
        "Yopougon": {
            lieu: "Siporex",
            desc: "Rassemblement au Carrefour Siporex de Yopougon"
        },
        "Adjamé": {
            lieu: "Mairie d'Adjamé",
            desc: "Rassemblement sur l'esplanade de la Mairie d'Adjamé"
        },
        "Abobo": {
            lieu: "Gendarmerie d'Abobo",
            desc: "Point réservé exclusivement aux résidents d'Abobo"
        },
        "Songon": {
            lieu: "Examiné selon le nombre de personnes",
            desc: "Les délégués CORA EVENTS contacteront directement chaque inscrit"
        }
    };

    const communePointNotice = document.getElementById("communePointNotice");
    const communePointNom = document.getElementById("communePointNom");
    const communePointAlert = document.getElementById("communePointAlert");
    const formFlowCommune = document.getElementById("formFlowCommune");

    if (champCommune) {
        champCommune.addEventListener("change", () => {
            const val = champCommune.value;
            const config = POINTS_RASSEMBLEMENT[val];
            if (config && communePointNotice && communePointNom && communePointAlert) {
                communePointNom.textContent = config.lieu;
                if (formFlowCommune) formFlowCommune.textContent = val;
                communePointNotice.style.display = "flex";
                if (val === "Abobo") {
                    communePointAlert.innerHTML = `✅ <strong>Point direct Abobo :</strong> Rassemblement à la Gendarmerie d'Abobo dès 08h30.`;
                } else if (val === "Songon") {
                    communePointAlert.innerHTML = `ℹ️ <strong>Régulation Songon :</strong> Le lieu définitif sera communiqué individuellement par nos délégués selon le nombre total d'inscrits.`;
                } else {
                    communePointAlert.innerHTML = `⚠️ <strong>Consigne impérative :</strong> Vous devez vous rendre directement à <strong>${config.lieu}</strong> le 13 décembre à 08h30 et <u>non à la Gendarmerie d'Abobo</u>.`;
                }
            }
        });
    }

    // --- GESTION DES ONGLETS FLOTTANTS (FILTRE VISUEL) ---
    const tabsBar = document.getElementById("communeTabsBar");
    if (tabsBar) {
        const tabBtns = tabsBar.querySelectorAll(".floating-tab-btn");
        const cards = document.querySelectorAll("#departureCardsGrid .floating-tab-card");

        tabBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                tabBtns.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");

                const filter = btn.getAttribute("data-filter");
                cards.forEach((card) => {
                    const commune = card.getAttribute("data-commune");
                    if (filter === "all" || commune === filter) {
                        card.style.display = "flex";
                    } else {
                        card.style.display = "none";
                    }
                });
            });
        });
    }

    // --- SÉLECTION RAPIDE DEPUIS UNE CARTE FLOTTANTE ---
    window.choisirPointEtReserver = function(commune) {
        if (champCommune) {
            champCommune.value = commune;
            champCommune.dispatchEvent(new Event("change"));

            const billetterie = document.getElementById("billetterie");
            if (billetterie) {
                billetterie.scrollIntoView({ behavior: "smooth" });
            }

            const info = POINTS_RASSEMBLEMENT[commune];
            const nomPoint = info ? info.lieu : commune;
            afficherToast(`Commune choisie : ${commune} ➔ ${nomPoint}`, "info");

            if (champNom) {
                setTimeout(() => champNom.focus(), 600);
            }
        }
    };

    // --- 6. MENU MOBILE ---
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const navLinks = document.getElementById("navLinks");
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener("click", () => {
            navLinks.classList.toggle("mobile-open");
        });

        // Fermer le menu lors du clic sur un lien
        navLinks.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("mobile-open");
            });
        });
    }

    // --- 7. SOUMISSION DU FORMULAIRE ---
    if (formulaire) {
        formulaire.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nom = champNom.value.trim();
            const email = champEmail ? champEmail.value.trim() : "";
            const telephone = champTelephone.value.trim();
            const commune = champCommune.value;

            if (!nom) {
                afficherToast("Veuillez renseigner votre nom et vos prénoms.", "error");
                champNom.focus();
                return;
            }

            if (!email || !email.includes("@")) {
                afficherToast("Veuillez renseigner une adresse email valide.", "error");
                if (champEmail) champEmail.focus();
                return;
            }

            if (!telephone) {
                afficherToast("Veuillez renseigner votre numéro de téléphone.", "error");
                champTelephone.focus();
                return;
            }

            if (!commune) {
                afficherToast("Veuillez sélectionner votre commune de départ.", "error");
                champCommune.focus();
                return;
            }

            const configPoint = POINTS_RASSEMBLEMENT[commune];
            const pointRassemblement = configPoint ? configPoint.lieu : "Point de votre commune";

            const total = quantite * PRIX_UNITAIRE;

            // Désactiver le bouton pendant le chargement
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Création de votre réservation en cours...";

            try {
                const reponse = await fetch("/api/reservations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        nom: nom,
                        email: email,
                        telephone: telephone,
                        commune: commune,
                        point_rassemblement: pointRassemblement,
                        ticket: "Pass Convoi Petit Paradis",
                        quantite: quantite,
                        prix_unitaire: PRIX_UNITAIRE,
                        total: total
                    })
                });

                const resultat = await reponse.json();

                if (reponse.ok && resultat.success) {
                    const resId = resultat.reservation_id;
                    const reservationObj = {
                        id: resId,
                        nom: nom,
                        email: email,
                        telephone: telephone,
                        commune: commune,
                        point_rassemblement: pointRassemblement,
                        ticket: "Pass Convoi Petit Paradis",
                        quantite: quantite,
                        prix_unitaire: PRIX_UNITAIRE,
                        total: total,
                        statut: "EN_ATTENTE",
                        date_creation: new Date().toISOString()
                    };

                    localStorage.setItem("reservation_id", resId);
                    localStorage.setItem("reservation_data", JSON.stringify(reservationObj));

                    afficherToast("Réservation enregistrée ! Redirection vers le paiement Wave...", "success");

                    setTimeout(() => {
                        window.location.href = `paiement.html?id=${resId}`;
                    }, 500);
                    return;
                }
            } catch (erreur) {
                console.warn("Serveur Node.js non détecté, utilisation du mode direct :", erreur);
            }

            // Mode direct / Hors ligne (ex: ouverture directe des fichiers HTML)
            const localId = Math.floor(1000 + Math.random() * 9000);
            const localObj = {
                id: localId,
                nom: nom,
                email: email,
                telephone: telephone,
                commune: commune,
                point_rassemblement: pointRassemblement,
                ticket: "Pass Convoi Petit Paradis",
                quantite: quantite,
                prix_unitaire: PRIX_UNITAIRE,
                total: total,
                statut: "EN_ATTENTE",
                date_creation: new Date().toISOString()
            };

            localStorage.setItem("reservation_id", localId);
            localStorage.setItem("reservation_data", JSON.stringify(localObj));

            afficherToast("Réservation validée ! Redirection vers le paiement Wave...", "success");

            setTimeout(() => {
                window.location.href = `paiement.html?id=${localId}`;
            }, 500);
        });
    }

    // =========================================================================
    // MOTEUR D'ANIMATIONS AVANCÉES (STYLE CODEXA DEVLABS)
    // =========================================================================

    // --- A. BARRE DE PROGRESSION DE SCROLL ---
    function initScrollProgress() {
        let progressBar = document.getElementById("scrollProgressBar");
        if (!progressBar) {
            progressBar = document.createElement("div");
            progressBar.id = "scrollProgressBar";
            progressBar.className = "scroll-progress-bar";
            document.body.prepend(progressBar);
        }

        window.addEventListener("scroll", () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) : 0;
            progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollPercent))})`;
        }, { passive: true });
    }

    // --- B. CANVAS DE PARTICULES & CONSTELATIONS DORÉES ---
    function initParticlesCanvas() {
        const canvas = document.getElementById("particlesCanvas");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        let particles = [];
        let animationFrameId;
        let width = 0;
        let height = 0;

        const mouse = {
            x: null,
            y: null,
            radius: 120
        };

        function resize() {
            width = canvas.width = canvas.offsetWidth || window.innerWidth;
            height = canvas.height = canvas.offsetHeight || 600;
        }

        window.addEventListener("resize", resize);
        resize();

        window.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        }, { passive: true });

        window.addEventListener("mouseleave", () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2.2 + 0.8;
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 20) + 1;
                this.vx = (Math.random() - 0.5) * 0.45;
                this.vy = (Math.random() - 0.5) * 0.45;
                this.alpha = Math.random() * 0.6 + 0.2;
                this.goldColor = Math.random() > 0.3 ? "197, 154, 68" : "223, 186, 115";
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.goldColor}, ${this.alpha})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(${this.goldColor}, 0.5)`;
                ctx.fill();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Interaction avec la souris
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouse.radius) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const maxDistance = mouse.radius;
                        const force = (maxDistance - distance) / maxDistance;
                        const directionX = forceDirectionX * force * this.density * 0.6;
                        const directionY = forceDirectionY * force * this.density * 0.6;

                        this.x -= directionX;
                        this.y -= directionY;
                    }
                }
            }
        }

        const particleCount = Math.min(50, Math.floor(window.innerWidth / 28));
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function connect() {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a + 1; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 110) {
                        const opacity = (1 - dist / 110) * 0.22;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(197, 154, 68, ${opacity})`;
                        ctx.lineWidth = 0.8;
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].draw();
                particles[i].update();
            }
            connect();
            animationFrameId = requestAnimationFrame(animate);
        }

        animate();
    }

    // --- C. SPOTLIGHT ET 3D TILT SUR LES CARTES ---
    function initCardSpotlightAndTilt() {
        const cards = document.querySelectorAll(
            ".key-point-card, .value-card, .timeline-card, .floating-tab-card, .ticket-showcase-card, .rules-content-grid, .prep-step-card, .temoignage-card, .faq-item, .contact-card-modern, .admin-kpi-card"
        );

        cards.forEach((card) => {
            card.classList.add("card-spotlight");

            card.addEventListener("mousemove", (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                card.style.setProperty("--mouse-x", `${x}px`);
                card.style.setProperty("--mouse-y", `${y}px`);

                // 3D Tilt léger
                if (window.innerWidth > 992) {
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const tiltX = ((y - centerY) / centerY) * -4;
                    const tiltY = ((x - centerX) / centerX) * 4;
                    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px)`;
                }
            });

            card.addEventListener("mouseleave", () => {
                card.style.transform = "";
                card.style.setProperty("--mouse-x", `-500px`);
                card.style.setProperty("--mouse-y", `-500px`);
            });
        });
    }

    // --- D. MOTEUR SCROLL-REVEAL AVEC INTERSECTION OBSERVER ---
    function initScrollReveal() {
        // Ajouter automatiquement les attributs de reveal aux sections et cartes
        const revealTargets = [
            { sel: ".section-head", effect: "up", delay: "0.1s" },
            { sel: ".values-grid .value-card", effect: "up", delay: "0.15s" },
            { sel: ".timeline-item", effect: "up", delay: "0.1s" },
            { sel: ".departure-cards-grid .floating-tab-card", effect: "up", delay: "0.1s" },
            { sel: ".ticket-showcase-card", effect: "scale", delay: "0.15s" },
            { sel: ".rules-section", effect: "up", delay: "0.1s" },
            { sel: ".prep-step-card", effect: "up", delay: "0.12s" },
            { sel: ".temoignage-card", effect: "up", delay: "0.15s" },
            { sel: ".faq-item", effect: "up", delay: "0.08s" },
            { sel: ".contact-card-modern", effect: "scale", delay: "0.2s" },
            { sel: ".hero-content-col", effect: "left", delay: "0.05s" },
            { sel: ".hero-visual-col", effect: "right", delay: "0.15s" }
        ];

        revealTargets.forEach(({ sel, effect, delay }) => {
            const elements = document.querySelectorAll(sel);
            elements.forEach((el, index) => {
                if (!el.hasAttribute("data-reveal")) {
                    el.setAttribute("data-reveal", effect);
                    const calculatedDelay = (parseFloat(delay) + (index % 4) * 0.07).toFixed(2);
                    el.style.setProperty("--reveal-delay", `${calculatedDelay}s`);
                }
            });
        });

        const revealElements = document.querySelectorAll("[data-reveal]");
        if (!("IntersectionObserver" in window)) {
            revealElements.forEach(el => el.classList.add("is-revealed"));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-revealed");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: "0px 0px -40px 0px"
        });

        revealElements.forEach((el) => observer.observe(el));
    }

    // --- E. EFFET RIPPLE AU CLIC SUR LES BOUTONS ---
    function initRippleEffect() {
        const clickable = document.querySelectorAll(
            ".btn-primary, .btn-secondary, .nav-cta-btn, .btn-whatsapp-full, .floating-tab-btn, .btn-reserver-floating"
        );

        clickable.forEach((btn) => {
            btn.classList.add("ripple-surface");
            btn.addEventListener("click", function(e) {
                const rect = this.getBoundingClientRect();
                const circle = document.createElement("span");
                const diameter = Math.max(rect.width, rect.height);
                const radius = diameter / 2;

                circle.style.width = circle.style.height = `${diameter}px`;
                circle.style.left = `${e.clientX - rect.left - radius}px`;
                circle.style.top = `${e.clientY - rect.top - radius}px`;
                circle.classList.add("ripple-wave");

                const ripple = this.querySelector(".ripple-wave");
                if (ripple) ripple.remove();

                this.appendChild(circle);
                setTimeout(() => circle.remove(), 650);
            });
        });
    }

    // --- F. CURSEUR LUMINEUX SUIVEUR (DESKTOP) ---
    function initCursorGlow() {
        if (window.matchMedia("(hover: hover) and (min-width: 1024px)").matches) {
            const glowOrb = document.createElement("div");
            glowOrb.className = "cursor-glow-orb";
            document.body.appendChild(glowOrb);

            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let currentX = mouseX;
            let currentY = mouseY;

            window.addEventListener("mousemove", (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            }, { passive: true });

            function render() {
                currentX += (mouseX - currentX) * 0.12;
                currentY += (mouseY - currentY) * 0.12;
                glowOrb.style.left = `${currentX}px`;
                glowOrb.style.top = `${currentY}px`;
                requestAnimationFrame(render);
            }
            render();

            const interactiveElements = document.querySelectorAll("a, button, input, select, .card-spotlight");
            interactiveElements.forEach((el) => {
                el.addEventListener("mouseenter", () => document.body.classList.add("is-hovering-interactive"));
                el.addEventListener("mouseleave", () => document.body.classList.remove("is-hovering-interactive"));
            });
        }
    }

    // --- G. SMOOTH SCROLLSPY POUR LA NAVIGATION ---
    function initScrollSpy() {
        const sections = document.querySelectorAll("section[id]");
        const navLinks = document.querySelectorAll(".nav-links a[href^='#']");

        window.addEventListener("scroll", () => {
            let current = "";
            sections.forEach((section) => {
                const sectionTop = section.offsetTop - 120;
                const sectionHeight = section.offsetHeight;
                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    current = section.getAttribute("id");
                }
            });

            navLinks.forEach((link) => {
                link.classList.remove("active");
                if (link.getAttribute("href") === `#${current}`) {
                    link.classList.add("active");
                }
            });
        }, { passive: true });
    }

    // --- LANCEMENT DES MODULES D'ANIMATION ---
    initScrollProgress();
    initParticlesCanvas();
    initCardSpotlightAndTilt();
    initScrollReveal();
    initRippleEffect();
    initCursorGlow();
    initScrollSpy();
});