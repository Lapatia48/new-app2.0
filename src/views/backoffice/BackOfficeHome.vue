<template>
    <div class="backoffice-home">
        <section class="hero-card">
            <p class="eyebrow">BackOffice</p>
            <h1>Bienvenue sur le BackOffice</h1>
            <p>
                Vous êtes connecté avec les identifiants configurés dans le fichier .env.
                Utilisez le menu ci-dessous pour gérer les données GLPI.
            </p>

            <div class="cartes">
                <RouterLink :to="{ name: 'bo-dashboard' }" class="carte">Tableau de bord</RouterLink>
                <RouterLink :to="{ name: 'bo-tickets' }" class="carte">Tickets</RouterLink>
                <RouterLink :to="{ name: 'bo-import' }" class="carte">Importer les données</RouterLink>
                <RouterLink :to="{ name: 'bo-reset' }" class="carte">Réinitialiser</RouterLink>
            </div>
        </section>
    </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.backoffice-home {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem;
}

.hero-card {
    width: min(100%, 640px);
    padding: 3rem;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.3);
    color: #0f172a;
}

.eyebrow {
    margin: 0 0 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.8rem;
    font-weight: 700;
}

h1 {
    margin: 0 0 1rem;
    font-size: clamp(2rem, 4vw, 3.5rem);
    line-height: 1.05;
}

p {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.6;
    color: #334155;
}

.cartes {
    margin-top: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
}

.carte {
    display: block;
    padding: 1rem;
    text-align: center;
    border-radius: 10px;
    background: #2563eb;
    color: #ffffff;
    font-weight: 600;
}

.carte:hover {
    background: #1d4ed8;
}
</style>