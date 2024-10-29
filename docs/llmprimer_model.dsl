workspace {

    model {
        Creator = person "Learning Assistant Creator" {
            description "Creates Learning Assistants"
        }
        
        Teacher = person "Teacher" {
            description "User who acts as teacher on the LMS. "
        }
        
        Student = person "Student" {
            description "Student User on the LMS, accesses learning activites."
        }

        Manager = softwareSystem "Learning Assistant Manager" {
            description "Framework for creation and provision of Learning Assistants"
        }

        UI = softwareSystem "Chatbot Interface" {
            description ""
        }

        EmbeddingDB = softwareSystem "Knowledge Base" {
            description ""
        }

        LMSIntegration = softwareSystem "LLMentor LTI Provider" {
            description "Allows for the integration of Learning Assitants as course activities for the LMS"
        }

        Infrastructure = softwareSystem "AI Infrastructure" {
            description "Provides LLM inference and embeddings."
        }

        LMS = softwareSystem "Learning Management System" {
            description "Implements by default LTI consumer wich allows it to connect to the LLMentor LTI Provider"
   
        }

        Creator -> Manager "creates Learning Assistants with Contents and Engineering Prompts"

        UI -> Manager "Uses OpenAI REST like API"
        Manager -> EmbeddingDB "Creates Knowledge collections"
        EmbeddingDB -> Manager "Semantic Similitude Retrieval"
        Manager -> LMSIntegration "Sets up LTI Assistants"
        Manager -> Infrastructure "Uses for LLM inference and embeddings calculations"
        LMSIntegration -> LMS "Sets up LTI Assistant on course Context"
        LMS -> UI "Launches LTI Assistants"
        Teacher -> LMS "Sets up LTI Assistant LTI binding"
        Student -> LMS "Accesses LTI Assistant LTI Binding"
        Student -> UI "Accesses LTI Assistant authenticated via the LMS"
        LMSIntegration -> UI "Sets up LMS users for Learning Assitant"
    }

    views {
        systemContext Manager {
            include *
            autolayout tb
        }
        
        systemContext LMS {
            include *
            include Manager
            autolayout rl
        }
        systemLandscape {
            include *
            autolayout rl
        }

        theme default 
        styles {
            element LMS {
                background #FF9800
            }
            relationship * {
                color black
                colour black
                fontsize 18
                
                
            }
        }
    }
}
