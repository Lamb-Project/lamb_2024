//Basic Augment 

// const { generateMarkdownForContext } = require("../../utils/html_util");

const { checkContextConsistency, getContextNumberOfItems, getContextDocument, getContextURL, 
  getContextKind, getContextSource } = require("./util");

const _prompt_template = `- Estas son las fuentes más relevantes para responder a la pregunta:
---
          {CONTEXT} 
---
- contesta la siguiente pregunta:
---
          {QUESTION}
---
`;


async function augment(context, query, prompt_template) {
  try {

    debug = false;
    checkContextConsistency(context);   // Hey its cool and does not hurt
  
    let augmentedContext = "";
    for (let i = 0; i < getContextNumberOfItems(context); i++) {
      augmentedContext += "*** \n Fuente " + i+ " \n" + getContextSource(context, i) + "\n";
      augmentedContext += "Tipo fuente:" + getContextKind(context, i) + "\n";
      augmentedContext += "URL:" + getContextURL(context, i)  + "\n";
      augmentedContext += "Contenido: ***" + getContextDocument(context, i)+ " \n";
      augmentedContext += "*** \n";
    }
    if (debug) {
      console.log("----------------Augmented content:".augmentedContext);
    }

    let prompt = prompt_template.replace("{CONTEXT}", augmentedContext);
    prompt = prompt.replace("{QUESTION}", query);
    if (debug) {
      console.log("-------------- Prompt:".prompt);
    } 
    return {
      needsAugmentation: false,
      success: true,
      context_response: augmentedContext,
      augmentedPrompt: prompt.trim()
    };
  } catch (error) {
    console.error("Failed to augment:", error);
    // Return an error state in the structured response
    return {
      success: false,
      error: "Error in augmentation: " + error
    };
  }
}


module.exports = {
  augment,
};
