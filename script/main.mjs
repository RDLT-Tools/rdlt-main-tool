import App from "./App.mjs";
import SVGAssetsRepository from "./render/builders/SVGAssetsRepository.mjs";

async function start() {
    console.log("Starting app...");
    await App.initialize();

    console.log("Loading SVG assets...");
    await SVGAssetsRepository.initialize();
    
    console.log("App is ready.");
}

start();
