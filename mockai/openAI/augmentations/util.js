
function generateContentForQuotesAndVideos(augmentedContent, width = "560", height = "315") {
    // Function to extract the video ID from a YouTube URL
    const extractVideoID = (url) => {
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[7].length == 11) ? match[7] : false;
    };
  
    // Initialize an empty string for the HTML content
    let htmlContent = '## Fuentes';
    urls = Array.from(augmentedContent.urls)
    sources = Array.from(augmentedContent.sources)
    kinds = Array.from(augmentedContent.kinds)
    urls.forEach((url, index) => {
      const videoID = extractVideoID(url);
      // Ensure the sources array has an element at the current index
      const sourceQuote = sources[index] ? sources[index] : "No source available";
      htmlContent += `
        ### Fuente ${index + 1}:
       ${sourceQuote} 
       `;
      if (videoID) {
        htmlContent += `
                <div style="margin-bottom: 20px;">
                    <iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoID}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
  `;
      }
    });
    return htmlContent;
  }
  
  
  
  function checkContextConsistency(context) {
    if (context.documents[0].length != context.metadatas[0].length) {
      throw new Error("Inconsistent context: documents and metadatas have different lengths");
    }
  }
  
  function getContextNumberOfItems(context) {
    checkContextConsistency(context);
    return context.documents[0].length; // shoudl be same as context.metadatas[0].length  
  }
  
  function checkContextDocument(context, document_number) {
    if (document_number < 0 || document_number >= getContextNumberOfItems(context)) {
      throw new Error("Invalid document number");
    }
  }
  
  function getContextDocument(context, document_number) {
    checkContextDocument(context, document_number);
    return context.documents[0][document_number];
  }
  
  function getContextURL(context, document_number) {
    checkContextDocument(context, document_number);
    if (!context.metadatas[0][document_number]["url"]) {
      return ""; // no url, but let's not throw an error and panic
    }
    return context.metadatas[0][document_number]["url"];
  }
  
  function getContextSource(context, document_number) {
    checkContextDocument(context, document_number);
    if (!context.metadatas[0][document_number]["source"]) {
      return ""; // no source, but let's not throw an error and panic
    }
    if (!context.metadatas[0][document_number]["number"]) {
        return ""; // no number, but let's not throw an error and panic
    }
    return context.metadatas[0][document_number]["source"] +" Chunk number: "+ context.metadatas[0][document_number]["number"];
  }

  function getContextKind(context, document_number) {
    // kind is a mandatory field in the metadata
    // options= "online_video", "online_pdf", "webpage", "offline_odcument"....
    checkContextDocument(context, document_number);
    if (!context.metadatas[0][document_number]["kind"]) {
      throw new Error("Kind not found in metadata for document number " + document_number + " in context.");
      // kind should be there, now let's panic Whahhhhhh!
    }
    return context.metadatas[0][document_number]["kind"];
  }
  
  


module.exports = { generateContentForQuotesAndVideos, checkContextConsistency, getContextNumberOfItems, checkContextDocument, getContextDocument, getContextURL, getContextKind , getContextSource};  