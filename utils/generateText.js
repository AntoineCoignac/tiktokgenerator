import { Mistral } from '@mistralai/mistralai';

export async function generateText(destination) {
    try {
        const apiKey = process.env.MISTRAL_API_KEY;
        const client = new Mistral({ apiKey: apiKey });

        const chatResponse = await client.chat.complete({
            model: 'mistral-tiny',
            messages: [{ role: 'user', content: `Ecris un script de vidéo verticale de 30s en français qui sera réciter. Tu parleras de la destination suivante : ${destination}. Fais rêver les gens, n'oublie pas de faire des phrases captivante pour garder l'engagement des viewers. Important : ne dis pas "Bonjour" au début, rentre directement dans le sujet. Pour t'inspirer, tu pourras parler des informations suivantes : Localisation, Langue parlée, Monnaie, Passeport et visa, Comment s’y rendre, Météo, Hébergement, Sites touristiques, Gastronomie, Coût de la vie, Pourboires, Prises électriques (adaptateurs), Horaires des restaurants et commerces.` }],
            temperature: 0.1,
        });

        const text = chatResponse.choices[0].message.content;

        return text;
    }catch (error) {
        console.error("Error generating text:", error);
        return null;
    }
}