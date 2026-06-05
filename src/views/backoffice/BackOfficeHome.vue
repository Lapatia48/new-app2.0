<template>
    <div class="backoffice-home">
        <section class="hero-card">
            <p class="eyebrow">BackOffice</p>
            <h1>Bienvenue sur le BackOffice</h1>
            <p>
                Vous êtes connecté avec les identifiants configurés dans le fichier .env.
            </p>
        </section>
    </div>
</template>

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
</style>