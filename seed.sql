USE imagegro_yamaha;

-- Insert realistic Yamaha bikes. Behavior weights and quiz metadata
-- are configured from the admin panel in the current system.
INSERT INTO bikes (model_name, type, description, image_url) VALUES 
('Yamaha R15M', 'Supersport', 'The racing legend. Perfectly tuned for the track and aggressive high-speed riding.', '/bikes/r15m.png'),
('Yamaha MT-15 V2', 'Hyper Naked', 'The dark warrior of the streets. Agile, torquey, and aggressive for the ultimate night rider.', '/bikes/mt15.png'),
('Yamaha FZ-X', 'Neo-Retro', 'Ride free with the crossover motorcycle designed for both city commute and light touring.', '/bikes/fzx.png'),
('Yamaha Aerox 155', 'Maxi-Sports Scooter', 'The ultimate performance scooter that redefines your daily urban commute with speed and style.', '/bikes/aerox.png');
