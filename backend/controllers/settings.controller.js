import Settings from '../models/settings.model.js';
import User from '../models/user.model.js';

const editableProfileFields = ['name', 'phone', 'department', 'position', 'avatar'];
const safeUserProjection = '-password -refreshToken -resetPasswordToken -resetPasswordExpire';

const getOrCreateSettings = async (userId) => {
  let settings = await Settings.findOne({ user: userId });
  if (!settings) settings = await Settings.create({ user: userId });
  return settings;
};

export const updateCompanySettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user._id);
    const updates = req.body || {};
    settings.companyProfile = {
      ...(settings.companyProfile || {}),
      ...updates,
    };
    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user._id);
    const user = await User.findById(req.user._id).select(safeUserProjection);
    res.json({ success: true, settings, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfileSettings = async (req, res) => {
  try {
    const updates = {};
    editableProfileFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const sanitizedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
      .select(safeUserProjection);

    res.json({ success: true, user: sanitizedUser });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { notifications, appearance, regional } = req.body;
    const settings = await getOrCreateSettings(req.user._id);

    if (notifications) settings.notifications = { ...settings.notifications.toObject(), ...notifications };
    if (appearance) settings.appearance = { ...settings.appearance.toObject(), ...appearance };
    if (regional) settings.regional = { ...settings.regional.toObject(), ...regional };

    await settings.save();

    await User.findByIdAndUpdate(req.user._id, {
      notifyEmail: settings.notifications.email,
      notifyInApp: settings.notifications.inApp,
    });

    res.json({ success: true, settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
