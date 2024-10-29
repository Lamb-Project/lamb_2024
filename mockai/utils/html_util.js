function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}




function generateHTMLForVideos(urls, width = "560", height = "315") {
    // Function to extract the video ID from a YouTube URL
    const extractVideoID = (url) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length == 11) ? match[7] : false;
    };
  
    // Generate the HTML string for embedding all videos with smaller dimensions
    let htmlContent = '<!DOCTYPE html><html><head><title>Embedded YouTube Videos</title></head><body>';
    urls.forEach((url) => {
        const videoID = extractVideoID(url);
        if (videoID) {
            htmlContent += ` Source: <br>
                <div style="margin-bottom: 20px;">
                    <iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoID}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            `;
        } else {
            htmlContent += `<p>Video URL not valid or ID not found: ${url}</p>`;
        }
    });
    htmlContent += '</body></html>';
    return htmlContent;
  }

function generateMarkdownForObject(object) {
    // Define the recursive function for converting object to markdown
    function objectToMarkdown(obj, indent = '') {
        let markdown = '';
        const indentStep = '  '; // Define how much to indent at each level

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                // It's a nested object
                markdown += `${indent}- **${key}**:\n`;
                markdown += objectToMarkdown(value, indent + indentStep); // Recursively process nested objects
            } else if (Array.isArray(value)) {
                // It's an array (including tuples, as JavaScript treats them as arrays)
                markdown += `${indent}- **${key}**:\n`;
                value.forEach((item) => {
                    if (typeof item === 'object') {
                        // If the item is an object, recursively process it
                        markdown += objectToMarkdown(item, indent + indentStep);
                    } else {
                        // For primitive types within the array
                        markdown += `${indent}${indentStep}- ${item}\n`;
                    }
                });
            } else {
                // Primitive type or something that doesn't require further nesting
                markdown += `${indent}- **${key}**: ${value}\n`;
            }
        }

        return markdown;
    }

    // Use the recursive function to convert the entire context object to markdown
    return objectToMarkdown(object);
}


function generateMarkdownForContext(context) {
    return `<div>
<h3> context </h3>    
    ${escapeHtml(generateMarkdownForObject(context))}

<h3> Content </h3>
</div>`;
}

  module.exports = { generateHTMLForVideos , generateMarkdownForContext, generateMarkdownForObject};