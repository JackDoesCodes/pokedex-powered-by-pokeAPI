/* © Joaquin Baigorria */

import express from "express";
import axios from "axios";
import { EventEmitter } from "events";

const app = express();
const port = 3000;
const API_URL = "https://pokeapi.co/api/v2/"; // endpoint for getting the pokemon data

EventEmitter.defaultMaxListeners = 20; // axios memory leak fix

app.use(express.static("public"));

app.get("/", async (req, res) => {
  /* Home route */
  try {
    const responseData = await axios.get(API_URL + "pokemon?limit=1025&offset=0");
    const pokeLists = responseData.data.results.slice(0, 1025); // get pokemon objects from 1 to 1025
    const currentYear = new Date().getFullYear();

    res.render("index.ejs", {
      pokeLists: pokeLists,
      currentYear: currentYear,
    });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", { error: error.message });
  }
});

app.get("/pokemon/:id", async (req, res) => {
  /* Pokemon route */
  try {
    const { id } = req.params;
    const responsePokemon = await axios.get(API_URL + "pokemon/" + id);
    const speciesUrl = responsePokemon.data.species.url;
    const responseSpecies = await axios.get(speciesUrl);
    const evoChainUrl = responseSpecies.data.evolution_chain.url;
    const responseEvo = await axios.get(evoChainUrl);

    // build name list
    let evoNames = [];
    let evoData = responseEvo.data.chain;
    do {
      evoNames.push(evoData.species.name);
      evoData = evoData.evolves_to[0];
    } while (evoData);

    const evoChain = await Promise.all( // asociate pokemon to it's sprite
      evoNames.map(async (name) => {
        try {
          const evoSprite = await axios.get(API_URL + "pokemon/" + name);
          return {
            name,
            id: evoSprite.data.id,
            sprite: evoSprite.data.sprites.front_default,
          };
        } catch {
          try {
            // get the species to find the default variety
            const species = await axios.get(API_URL + "pokemon-species/" + name);
            const defaultVariety = species.data.varieties.find(v => v.is_default);
            const evoSprite = await axios.get(defaultVariety.pokemon.url);
            return {
              name,
              id: evoSprite.data.id,
              sprite: evoSprite.data.sprites.front_default,
            };
          } catch {
            return { name, id: null, sprite: null }; // catches missing sprites and replaces with placeholder text
          }
        }
      })
    );
    const currentYear = new Date().getFullYear();

    res.render("pokemon.ejs", {
      species: responseSpecies.data,
      pokemon: responsePokemon.data,
      evoChain: evoChain,
      currentYear: currentYear,
      varieties: responseSpecies.data.varieties.filter(form => !form.is_default),
      baseId: responseSpecies.data.id
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
