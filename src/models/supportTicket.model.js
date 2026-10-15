import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        message: {
            type: String,
            required: [true, "Message cannot be empty."],
            trim: true,
            maxLength: [5000, "Message cannot exceed 5000 characters."],
        },
    },
    {
        timestamps: true,
    }
);

const supportTicketSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        subject: {
            type: String,
            required: [true, "Subject is required."],
            trim: true,
            minlength: [3, "subject must be at least 3 characters."],
            maxLength: [150, "subject cannot exceed 150 characters"],
        },

        description: {
            type: String,
            required: [true, "description is required."],
            trim: true,
            maxLength: [5000, "Description cannot exceed 5000 characters."],
        },

        messages: {
            type: [messageSchema],
            default:[]
        },

        status: {
            type: String,
            enum: ["Open", "In progress", "Resolved", "Closed"],
            default: "Open",
        },
        
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Urgent" ],
            default: "Medium",
        },

        assignedTo : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        resolution: {
            type: String,
            trim: true,
            maxLength: [5000, "Resolution cannot exceed 5000 characters."],
            default: ""
        },

        resolvedBy: {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

const SupportTicket = mongoose.model(
    "SupportTicket",
    supportTicketSchema
);

export default SupportTicket;