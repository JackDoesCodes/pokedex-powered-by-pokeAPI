import express from "express";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "https://pokeapi.co/api/v2/"; //endpoint for getting the pokemon data

app.use(express.static("public"));

app.get("/", async (req, res) => {
  try {
    const responseData = await axios.get(
      API_URL + "pokemon?limit=1025&offset=0",
    );
    const pokeLists = responseData.data.results.slice(0, 1025); // Get pokemon objects from 1 to 1025
    res.render("index.ejs", { pokeLists: pokeLists });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", { error: error.message });
  }
});

app.get("/pokemon/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [responseSpecies, responsePokemon] = await Promise.all([
      axios.get(API_URL + "pokemon-species/" + id),
      axios.get(API_URL + "pokemon/" + id),
    ]);

    const evoChainUrl = responseSpecies.data.evolution_chain.url;
    const responseEvo = await axios.get(evoChainUrl);

    // build name list
    let evoNames = [];
    let evoData = responseEvo.data.chain;
    do {
      evoNames.push(evoData.species.name);
      evoData = evoData.evolves_to[0];
    } while (evoData);

    // fetch all evolution sprites
    const evoChain = await Promise.all(
      evoNames.map(async (name) => {
        const evoSprite = await axios.get(API_URL + "pokemon/" + name);
        return {
          name,
          id: evoSprite.data.id,
          sprite: evoSprite.data.sprites.front_default,
        };
      }),
    );
    // render route passing args
    res.render("pokemon.ejs", {
      species: responseSpecies.data,
      pokemon: responsePokemon.data,
      evoChain,
    });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    console.error("Status:", error.response?.status);
    console.error("URL:", error.config?.url);
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
