const JobCard = require('../models/JobCard');

exports.getAllJobCards = async (req, res) => {
    try {
        const jobCards = await JobCard.find()
            .populate('customer')
            .sort({ createdAt: -1 });
        res.json(jobCards);
    } catch (error) {
        console.error('Error fetching job cards:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createJobCard = async (req, res) => {
    try {
        const jobCard = new JobCard(req.body);
        await jobCard.save();
        await jobCard.populate('customer');
        res.status(201).json(jobCard);
    } catch (error) {
        console.error('Error creating job card:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateJobCard = async (req, res) => {
    try {
        const jobCard = await JobCard.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('customer');

        if (!jobCard) {
            return res.status(404).json({ message: 'Job card not found' });
        }
        res.json(jobCard);
    } catch (error) {
        console.error('Error updating job card:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deleteJobCard = async (req, res) => {
    try {
        const jobCard = await JobCard.findByIdAndDelete(req.params.id);
        if (!jobCard) {
            return res.status(404).json({ message: 'Job card not found' });
        }
        res.json({ message: 'Job card deleted successfully' });
    } catch (error) {
        console.error('Error deleting job card:', error);
        res.status(500).json({ message: error.message });
    }
};
