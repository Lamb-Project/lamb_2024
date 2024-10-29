/**
 * This module prepares the context content and URLs without sending it to OpenAI.
 * It returns a JSON object containing the original system prompt, the augmented prompt (context),
 * and the URLs extracted from the context metadata.
 */

async function augment(context, query, prompt_template) {
  console.log("Running noAugment augmentation module");

  let augmentedContent = "";

  // Replace the template placeholder with the actual content
  augmentedContent = prompt_template.replace("{CONTEXT}", JSON.stringify(context));
  augmentedContent = augmentedContent.replace("{QUESTION}", query);

  // Structure and return the augmented content and URLs as a JSON object
  return {
      needsAugmentation: false, // Indicate that no augmentation is needed
      success: true, // Indicate that the operation was successful
      augmentedPrompt: augmentedContent.trim(), // Trimmed augmented content for neatness
  };
}

module.exports = {
  augment,
};
