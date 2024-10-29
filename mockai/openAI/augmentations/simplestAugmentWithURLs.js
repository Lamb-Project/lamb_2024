/**
 * This module augments the prompt with context, sends all to OpenAI
 * and returns the response. It then appends the sources URLs to the response.
 * 
 */

async function augment(context, query, prompt_template) {

    let augmentedContent = "";

    for (let i = 0; i < context.documents[0].length; i++) {
      augmentedContent += context.documents[0][i] + "\n";
      augmentedContent += "Source:" + context.metadatas[0][i]["url"] + "\n";
    }
    augmentedContent = prompt_template.replace("{CONTEXT}", augmentedContent);
    augmentedContent = augmentedContent.replace("{QUESTION}", query);
    

    return {
              needsAugmentation: true,
              success: true,
              augmentedPrompt: augmentedContent,
    };
  }



module.exports = {
  augment,
  };